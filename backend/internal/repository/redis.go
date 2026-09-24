package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"ujiancbt/backend/internal/config"
	"ujiancbt/backend/internal/domain"
)

const (
	StreamAnswersKey = "stream:cbt:answers"
	StreamGroup      = "cbt_db_workers"
)

type RedisRepository struct {
	client *redis.Client
}

func NewRedisRepository(cfg *config.Config) (*RedisRepository, error) {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		// Fallback to plain address if not URL format
		opts = &redis.Options{
			Addr:         cfg.RedisURL,
			PoolSize:     cfg.RedisPoolSize,
			MinIdleConns: 50,
			DialTimeout:  5 * time.Second,
			ReadTimeout:  3 * time.Second,
			WriteTimeout: 3 * time.Second,
		}
	} else {
		opts.PoolSize = cfg.RedisPoolSize
		opts.MinIdleConns = 50
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("[WARN] Redis ping failed (will retry on usage): %v", err)
	} else {
		log.Printf("[INFO] Redis connection pool initialized (PoolSize: %d)", cfg.RedisPoolSize)
	}

	// Ensure Consumer Group exists for Redis Stream
	_ = client.XGroupCreateMkStream(context.Background(), StreamAnswersKey, StreamGroup, "0").Err()

	return &RedisRepository{client: client}, nil
}

func (r *RedisRepository) Close() error {
	return r.client.Close()
}

// Session Token Management (Single-Session Enforcement)
func (r *RedisRepository) SetUserSession(ctx context.Context, userID, token string, exp time.Duration) error {
	key := fmt.Sprintf("sess:user:%s", userID)
	return r.client.Set(ctx, key, token, exp).Err()
}

func (r *RedisRepository) GetUserSession(ctx context.Context, userID string) (string, error) {
	key := fmt.Sprintf("sess:user:%s", userID)
	return r.client.Get(ctx, key).Result()
}

// Fast Sub-millisecond In-Memory Answer Storage (Hash)
func (r *RedisRepository) SaveAnswer(ctx context.Context, answer domain.AnswerPayload) error {
	hashKey := fmt.Sprintf("answers:%s:%s", answer.ExamID, answer.UserID)

	payloadBytes, err := json.Marshal(answer)
	if err != nil {
		return err
	}

	pipe := r.client.Pipeline()
	// 1. Save to Redis Hash for instant retrieval
	pipe.HSet(ctx, hashKey, answer.QuestionID, string(payloadBytes))
	pipe.Expire(ctx, hashKey, 48*time.Hour)

	// 2. Publish to Redis Stream for asynchronous persistence to PostgreSQL
	pipe.XAdd(ctx, &redis.XAddArgs{
		Stream: StreamAnswersKey,
		Values: map[string]interface{}{
			"payload": string(payloadBytes),
		},
	})

	_, err = pipe.Exec(ctx)
	return err
}

func (r *RedisRepository) GetUserAnswers(ctx context.Context, examID, userID string) (map[string]domain.AnswerPayload, error) {
	hashKey := fmt.Sprintf("answers:%s:%s", examID, userID)
	data, err := r.client.HGetAll(ctx, hashKey).Result()
	if err != nil {
		return nil, err
	}

	result := make(map[string]domain.AnswerPayload, len(data))
	for qID, valStr := range data {
		var a domain.AnswerPayload
		if err := json.Unmarshal([]byte(valStr), &a); err == nil {
			result[qID] = a
		}
	}
	return result, nil
}

// Exam Bundle Caching (Pre-warmed bundle delivery)
func (r *RedisRepository) SetExamBundleCache(ctx context.Context, examID string, bundle *domain.ExamBundle, ttl time.Duration) error {
	key := fmt.Sprintf("cache:exam_bundle:%s", examID)
	data, err := json.Marshal(bundle)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, string(data), ttl).Err()
}

func (r *RedisRepository) GetExamBundleCache(ctx context.Context, examID string) (*domain.ExamBundle, error) {
	key := fmt.Sprintf("cache:exam_bundle:%s", examID)
	val, err := r.client.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}
	var bundle domain.ExamBundle
	if err := json.Unmarshal([]byte(val), &bundle); err != nil {
		return nil, err
	}
	return &bundle, nil
}

// Real-Time Heartbeat & Participant Live Tracking (Sorted Set)
func (r *RedisRepository) RecordHeartbeat(ctx context.Context, examID, userID string, currentNumber int) error {
	key := fmt.Sprintf("heartbeat:%s", examID)
	score := float64(time.Now().Unix())
	member := fmt.Sprintf("%s:%d", userID, currentNumber)
	return r.client.ZAdd(ctx, key, redis.Z{Score: score, Member: member}).Err()
}

func (r *RedisRepository) GetActiveParticipantsCount(ctx context.Context, examID string, activeWindowSec int64) (int64, error) {
	key := fmt.Sprintf("heartbeat:%s", examID)
	now := time.Now().Unix()
	minScore := fmt.Sprintf("%d", now-activeWindowSec)
	maxScore := fmt.Sprintf("%d", now+60)
	return r.client.ZCount(ctx, key, minScore, maxScore).Result()
}

// Stream Consumer Batch Reader for Background Worker
func (r *RedisRepository) ReadStreamBatch(ctx context.Context, consumerName string, count int64, blockTime time.Duration) ([]redis.XStream, error) {
	return r.client.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    StreamGroup,
		Consumer: consumerName,
		Streams:  []string{StreamAnswersKey, ">"},
		Count:    count,
		Block:    blockTime,
	}).Result()
}

func (r *RedisRepository) AckStreamMessages(ctx context.Context, messageIDs []string) error {
	if len(messageIDs) == 0 {
		return nil
	}
	return r.client.XAck(ctx, StreamAnswersKey, StreamGroup, messageIDs...).Err()
}
