package repository

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"ujiancbt/backend/internal/config"
	"ujiancbt/backend/internal/domain"
)

type PostgresRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRepository(cfg *config.Config) (*PostgresRepository, error) {
	poolConfig, err := pgxpool.ParseConfig(cfg.PostgresURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database config: %w", err)
	}

	// Performance tuning for 15k concurrency
	poolConfig.MaxConns = int32(cfg.PostgresMaxConns)
	poolConfig.MinConns = int32(cfg.PostgresMinConns)
	poolConfig.MaxConnLifetime = 1 * time.Hour
	poolConfig.MaxConnIdleTime = 15 * time.Minute
	poolConfig.HealthCheckPeriod = 1 * time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		log.Printf("[WARN] PostgreSQL ping failed (will retry on usage): %v", err)
	} else {
		log.Printf("[INFO] PostgreSQL connection pool initialized (Max: %d, Min: %d)", cfg.PostgresMaxConns, cfg.PostgresMinConns)
	}

	return &PostgresRepository{pool: pool}, nil
}

func (r *PostgresRepository) Close() {
	if r.pool != nil {
		r.pool.Close()
	}
}

// User methods
func (r *PostgresRepository) GetUserByUsername(ctx context.Context, username string) (*domain.User, error) {
	query := `SELECT id, username, full_name, password_hash, role, school, created_at FROM users WHERE username = $1 LIMIT 1`
	row := r.pool.QueryRow(ctx, query, username)

	var u domain.User
	err := row.Scan(&u.ID, &u.Username, &u.FullName, &u.Password, &u.Role, &u.School, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *PostgresRepository) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	query := `SELECT id, username, full_name, role, school, created_at FROM users WHERE id = $1 LIMIT 1`
	row := r.pool.QueryRow(ctx, query, id)

	var u domain.User
	err := row.Scan(&u.ID, &u.Username, &u.FullName, &u.Role, &u.School, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// Exam methods
func (r *PostgresRepository) GetExamByID(ctx context.Context, examID string) (*domain.Exam, error) {
	query := `SELECT id, title, description, duration_minutes, passing_score, total_questions, status, randomize_order, start_time, end_time, created_at 
	          FROM exams WHERE id = $1 LIMIT 1`
	row := r.pool.QueryRow(ctx, query, examID)

	var e domain.Exam
	err := row.Scan(&e.ID, &e.Title, &e.Description, &e.DurationMin, &e.PassingScore, &e.TotalQuestions, &e.Status, &e.RandomizeOrder, &e.StartTime, &e.EndTime, &e.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *PostgresRepository) GetExamQuestions(ctx context.Context, examID string, includeCorrect bool) ([]domain.Question, error) {
	query := `SELECT id, exam_id, number, question_text, COALESCE(question_media, ''), options, correct_key, weight 
	          FROM questions WHERE exam_id = $1 ORDER BY number ASC`
	rows, err := r.pool.Query(ctx, query, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []domain.Question
	for rows.Next() {
		var q domain.Question
		var optionsJSON []domain.Option
		var correctKey string

		if err := rows.Scan(&q.ID, &q.ExamID, &q.Number, &q.QuestionText, &q.QuestionMedia, &optionsJSON, &correctKey, &q.Weight); err != nil {
			return nil, err
		}
		q.Options = optionsJSON
		if includeCorrect {
			q.CorrectKey = correctKey
		}
		questions = append(questions, q)
	}
	return questions, nil
}

// Exam Session methods
func (r *PostgresRepository) GetOrCreateSession(ctx context.Context, examID, userID string) (*domain.ExamSession, error) {
	query := `
		INSERT INTO exam_sessions (exam_id, user_id, start_time, status, violation_count)
		VALUES ($1, $2, NOW(), 'IN_PROGRESS', 0)
		ON CONFLICT (exam_id, user_id) 
		DO UPDATE SET exam_id = EXCLUDED.exam_id
		RETURNING id, exam_id, user_id, start_time, end_time, status, violation_count, final_score, created_at
	`
	row := r.pool.QueryRow(ctx, query, examID, userID)
	var s domain.ExamSession
	err := row.Scan(&s.ID, &s.ExamID, &s.UserID, &s.StartTime, &s.EndTime, &s.Status, &s.ViolationCount, &s.FinalScore, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *PostgresRepository) SubmitSession(ctx context.Context, examID, userID string, score float64) error {
	query := `
		UPDATE exam_sessions 
		SET status = 'SUBMITTED', end_time = NOW(), final_score = $3
		WHERE exam_id = $1 AND user_id = $2
	`
	_, err := r.pool.Exec(ctx, query, examID, userID, score)
	return err
}

// High-Throughput Bulk Batch Upsert for Answers (Write-Behind worker)
func (r *PostgresRepository) BatchUpsertAnswers(ctx context.Context, answers []domain.AnswerPayload) error {
	if len(answers) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	query := `
		INSERT INTO exam_answers (exam_id, user_id, question_id, selected_option, is_doubt, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (exam_id, user_id, question_id) 
		DO UPDATE SET 
			selected_option = EXCLUDED.selected_option,
			is_doubt = EXCLUDED.is_doubt,
			updated_at = EXCLUDED.updated_at
	`

	for _, a := range answers {
		batch.Queue(query, a.ExamID, a.UserID, a.QuestionID, a.SelectedOption, a.IsDoubt, a.Timestamp)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(answers); i++ {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("failed executing batch answer item %d: %w", i, err)
		}
	}

	return nil
}

// Record Violations Batch
func (r *PostgresRepository) BatchInsertViolations(ctx context.Context, violations []domain.ViolationPayload) error {
	if len(violations) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	query := `INSERT INTO audit_violations (exam_id, user_id, type, details, created_at) VALUES ($1, $2, $3, $4, $5)`
	updateSessionQuery := `UPDATE exam_sessions SET violation_count = violation_count + 1 WHERE exam_id = $1 AND user_id = $2`

	for _, v := range violations {
		batch.Queue(query, v.ExamID, v.UserID, string(v.Type), v.Details, v.Timestamp)
		batch.Queue(updateSessionQuery, v.ExamID, v.UserID)
	}

	br := r.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(violations)*2; i++ {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("failed executing violation batch item: %w", err)
		}
	}

	return nil
}
