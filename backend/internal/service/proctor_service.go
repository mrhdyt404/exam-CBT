package service

import (
	"context"
	"time"

	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/repository"
)

type ProctorService struct {
	pgRepo    *repository.PostgresRepository
	redisRepo *repository.RedisRepository
}

func NewProctorService(pg *repository.PostgresRepository, rds *repository.RedisRepository) *ProctorService {
	return &ProctorService{
		pgRepo:    pg,
		redisRepo: rds,
	}
}

func (s *ProctorService) HandleHeartbeat(ctx context.Context, payload domain.HeartbeatPayload) error {
	return s.redisRepo.RecordHeartbeat(ctx, payload.ExamID, payload.UserID, payload.CurrentNumber)
}

func (s *ProctorService) LogViolation(ctx context.Context, payload domain.ViolationPayload) error {
	if payload.Timestamp.IsZero() {
		payload.Timestamp = time.Now()
	}
	return s.pgRepo.BatchInsertViolations(ctx, []domain.ViolationPayload{payload})
}

func (s *ProctorService) GetLiveParticipantCount(ctx context.Context, examID string) (int64, error) {
	// Active within last 30 seconds
	return s.redisRepo.GetActiveParticipantsCount(ctx, examID, 30)
}
