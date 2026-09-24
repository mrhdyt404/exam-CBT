package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ujiancbt/backend/internal/config"
	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/repository"
)

func main() {
	cfg := config.LoadConfig()
	log.Println("[WORKER] Starting CBT Asynchronous Batch Ingest Worker...")

	pgRepo, err := repository.NewPostgresRepository(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Worker Postgres init failed: %v", err)
	}
	defer pgRepo.Close()

	redisRepo, err := repository.NewRedisRepository(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Worker Redis init failed: %v", err)
	}
	defer redisRepo.Close()

	hostname, _ := os.Hostname()
	consumerName := fmt.Sprintf("worker-%s-%d", hostname, os.Getpid())

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("[WORKER] Received termination signal. Stopping consumer gracefully...")
		cancel()
	}()

	batchBuffer := make([]domain.AnswerPayload, 0, cfg.WorkerBatchSize)
	messageIDs := make([]string, 0, cfg.WorkerBatchSize)
	ticker := time.NewTicker(cfg.WorkerFlushInterval)
	defer ticker.Stop()

	flushBatch := func() {
		if len(batchBuffer) == 0 {
			return
		}

		startTime := time.Now()
		batchCount := len(batchBuffer)

		flushCtx, flushCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer flushCancel()

		if err := pgRepo.BatchUpsertAnswers(flushCtx, batchBuffer); err != nil {
			log.Printf("[ERROR] Failed to persist answer batch to PostgreSQL: %v", err)
			return
		}

		if err := redisRepo.AckStreamMessages(flushCtx, messageIDs); err != nil {
			log.Printf("[WARN] Failed to ack stream messages: %v", err)
		}

		elapsed := time.Since(startTime)
		log.Printf("[WORKER] Flushed %d answers to PostgreSQL in %s", batchCount, elapsed)

		// Reset buffer
		batchBuffer = batchBuffer[:0]
		messageIDs = messageIDs[:0]
	}

	log.Printf("[WORKER] Listening to Redis Stream (%s) as consumer: %s", repository.StreamAnswersKey, consumerName)

	for {
		select {
		case <-ctx.Done():
			flushBatch()
			log.Println("[WORKER] Worker exited cleanly.")
			return
		case <-ticker.C:
			if len(batchBuffer) > 0 {
				flushBatch()
			}
		default:
			// Read up to 100 messages at a time with 1s block
			streams, err := redisRepo.ReadStreamBatch(ctx, consumerName, 100, 1*time.Second)
			if err != nil && err != context.Canceled {
				time.Sleep(500 * time.Millisecond)
				continue
			}

			for _, stream := range streams {
				for _, msg := range stream.Messages {
					payloadStr, ok := msg.Values["payload"].(string)
					if !ok {
						continue
					}

					var ans domain.AnswerPayload
					if err := json.Unmarshal([]byte(payloadStr), &ans); err == nil {
						batchBuffer = append(batchBuffer, ans)
						messageIDs = append(messageIDs, msg.ID)
					}
				}
			}

			// If reached batch threshold, flush immediately
			if len(batchBuffer) >= cfg.WorkerBatchSize {
				flushBatch()
			}
		}
	}
}
