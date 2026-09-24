package service

import (
	"context"
	"time"

	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/repository"
)

type AnswerService struct {
	redisRepo *repository.RedisRepository
}

func NewAnswerService(rds *repository.RedisRepository) *AnswerService {
	return &AnswerService{
		redisRepo: rds,
	}
}

// Sub-millisecond save to Redis Hash & Stream
func (s *AnswerService) SaveAnswer(ctx context.Context, payload domain.AnswerPayload) error {
	if payload.Timestamp.IsZero() {
		payload.Timestamp = time.Now()
	}
	return s.redisRepo.SaveAnswer(ctx, payload)
}

// Batch Sync for reconnection recovery
func (s *AnswerService) SaveBatchAnswers(ctx context.Context, batch domain.BatchAnswerPayload, userID string) error {
	for _, ans := range batch.Answers {
		ans.ExamID = batch.ExamID
		ans.UserID = userID
		if ans.Timestamp.IsZero() {
			ans.Timestamp = time.Now()
		}
		if err := s.redisRepo.SaveAnswer(ctx, ans); err != nil {
			return err
		}
	}
	return nil
}
