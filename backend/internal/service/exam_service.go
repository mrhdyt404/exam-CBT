package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/repository"
)

type ExamService struct {
	pgRepo    *repository.PostgresRepository
	redisRepo *repository.RedisRepository
}

func NewExamService(pg *repository.PostgresRepository, rds *repository.RedisRepository) *ExamService {
	return &ExamService{
		pgRepo:    pg,
		redisRepo: rds,
	}
}

// Get Exam Bundle with high performance Redis caching
func (s *ExamService) GetExamBundle(ctx context.Context, examID, userID string) (*domain.ExamBundle, error) {
	// 1. Try fetching from Redis first
	bundle, err := s.redisRepo.GetExamBundleCache(ctx, examID)
	if err != nil || bundle == nil {
		// Fallback to database
		exam, err := s.pgRepo.GetExamByID(ctx, examID)
		if err != nil {
			return nil, fmt.Errorf("exam not found: %w", err)
		}

		// Fetch questions without correct keys for student bundle
		questions, err := s.pgRepo.GetExamQuestions(ctx, examID, false)
		if err != nil {
			return nil, fmt.Errorf("failed fetching questions: %w", err)
		}

		bundle = &domain.ExamBundle{
			ExamID:         exam.ID,
			Title:          exam.Title,
			DurationMin:    exam.DurationMin,
			RandomizeOrder: exam.RandomizeOrder,
			Questions:      questions,
			TotalQuestions: len(questions),
		}

		// Generate bundle hash for CDN / client integrity verification
		data, _ := json.Marshal(bundle.Questions)
		hash := sha256.Sum256(data)
		bundle.BundleHash = hex.EncodeToString(hash[:])

		// Cache in Redis for 12 hours
		_ = s.redisRepo.SetExamBundleCache(ctx, examID, bundle, 12*time.Hour)
	}

	// If randomize order is enabled, shuffle questions deterministically using user ID as seed
	if bundle.RandomizeOrder && userID != "" {
		return s.shuffleForUser(bundle, userID), nil
	}

	return bundle, nil
}

// Deterministic shuffle per student
func (s *ExamService) shuffleForUser(original *domain.ExamBundle, userID string) *domain.ExamBundle {
	// Seed generator using sum of user ID bytes
	var seed int64
	for _, b := range []byte(userID + original.ExamID) {
		seed = seed*31 + int64(b)
	}
	r := rand.New(rand.NewSource(seed))

	shuffled := *original
	shuffled.Questions = make([]domain.Question, len(original.Questions))
	copy(shuffled.Questions, original.Questions)

	r.Shuffle(len(shuffled.Questions), func(i, j int) {
		shuffled.Questions[i], shuffled.Questions[j] = shuffled.Questions[j], shuffled.Questions[i]
	})

	return &shuffled
}

// Start or Resume an Exam Session
func (s *ExamService) StartExamSession(ctx context.Context, examID, userID string) (*domain.ExamSession, map[string]domain.AnswerPayload, error) {
	session, err := s.pgRepo.GetOrCreateSession(ctx, examID, userID)
	if err != nil {
		return nil, nil, err
	}

	if session.Status == domain.SessionSubmitted {
		return nil, nil, errors.New("exam has already been submitted")
	}

	// Fetch existing saved answers from Redis
	answers, err := s.redisRepo.GetUserAnswers(ctx, examID, userID)
	if err != nil {
		answers = make(map[string]domain.AnswerPayload)
	}

	return session, answers, nil
}

// Submit and Grade the Exam
func (s *ExamService) SubmitExam(ctx context.Context, examID, userID string) (float64, error) {
	// 1. Get student answers from Redis
	userAnswers, err := s.redisRepo.GetUserAnswers(ctx, examID, userID)
	if err != nil {
		return 0, err
	}

	// 2. Get questions with correct keys from database
	questions, err := s.pgRepo.GetExamQuestions(ctx, examID, true)
	if err != nil {
		return 0, err
	}

	if len(questions) == 0 {
		return 0, errors.New("exam has no questions")
	}

	// 3. Compute score
	var totalWeight float64
	var earnedWeight float64

	for _, q := range questions {
		weight := q.Weight
		if weight <= 0 {
			weight = 1.0
		}
		totalWeight += weight

		if ans, ok := userAnswers[q.ID]; ok {
			if ans.SelectedOption == q.CorrectKey {
				earnedWeight += weight
			}
		}
	}

	finalScore := 0.0
	if totalWeight > 0 {
		finalScore = (earnedWeight / totalWeight) * 100.0
	}

	// 4. Update session status in PostgreSQL
	if err := s.pgRepo.SubmitSession(ctx, examID, userID, finalScore); err != nil {
		return 0, err
	}

	return finalScore, nil
}
