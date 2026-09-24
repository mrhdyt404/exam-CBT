package domain

import "time"

// User Role
type Role string

const (
	RoleStudent Role = "STUDENT"
	RoleAdmin   Role = "ADMIN"
	RoleProctor Role = "PROCTOR"
)

// User Model
type User struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	FullName  string    `json:"full_name"`
	Password  string    `json:"-"`
	Role      Role      `json:"role"`
	School    string    `json:"school"`
	CreatedAt time.Time `json:"created_at"`
}

// Exam Status
type ExamStatus string

const (
	ExamDraft     ExamStatus = "DRAFT"
	ExamPublished ExamStatus = "PUBLISHED"
	ExamArchived  ExamStatus = "ARCHIVED"
)

// Session Status
type SessionStatus string

const (
	SessionInProgress   SessionStatus = "IN_PROGRESS"
	SessionSubmitted    SessionStatus = "SUBMITTED"
	SessionDisqualified SessionStatus = "DISQUALIFIED"
)

// Exam Model
type Exam struct {
	ID             string     `json:"id"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	DurationMin    int        `json:"duration_minutes"`
	PassingScore   float64    `json:"passing_score"`
	TotalQuestions int        `json:"total_questions"`
	Status         ExamStatus `json:"status"`
	RandomizeOrder bool       `json:"randomize_order"`
	StartTime      *time.Time `json:"start_time"`
	EndTime        *time.Time `json:"end_time"`
	CreatedAt      time.Time  `json:"created_at"`
}

// Question Option
type Option struct {
	Key  string `json:"key"`  // e.g. "A", "B", "C", "D", "E"
	Text string `json:"text"` // Option HTML/Markdown/Text
}

// Question Model
type Question struct {
	ID            string   `json:"id"`
	ExamID        string   `json:"exam_id"`
	Number        int      `json:"number"`
	QuestionText  string   `json:"question_text"`
	QuestionMedia string   `json:"question_media,omitempty"` // URL to image/audio on S3
	Options       []Option `json:"options"`
	CorrectKey    string   `json:"-"` // Hidden from student bundle
	Weight        float64  `json:"weight"`
}

// ExamBundle (Delivered to client, stripped of correct answers)
type ExamBundle struct {
	ExamID         string     `json:"exam_id"`
	Title          string     `json:"title"`
	DurationMin    int        `json:"duration_minutes"`
	RandomizeOrder bool       `json:"randomize_order"`
	Questions      []Question `json:"questions"`
	TotalQuestions int        `json:"total_questions"`
	BundleHash     string     `json:"bundle_hash"` // SHA256 checksum for CDN validation
}

// ExamSession Model
type ExamSession struct {
	ID             string        `json:"id"`
	ExamID         string        `json:"exam_id"`
	UserID         string        `json:"user_id"`
	StartTime      time.Time     `json:"start_time"`
	EndTime        *time.Time    `json:"end_time"`
	Status         SessionStatus `json:"status"`
	ViolationCount int           `json:"violation_count"`
	FinalScore     *float64      `json:"final_score"`
	CreatedAt      time.Time     `json:"created_at"`
}

// Answer Payload (Fast Ingestion)
type AnswerPayload struct {
	ExamID         string    `json:"exam_id"`
	UserID         string    `json:"user_id"`
	QuestionID     string    `json:"question_id"`
	SelectedOption string    `json:"selected_option"`
	IsDoubt        bool      `json:"is_doubt"`
	Timestamp      time.Time `json:"timestamp"`
}

// BatchAnswerPayload for network recovery sync
type BatchAnswerPayload struct {
	ExamID  string          `json:"exam_id"`
	Answers []AnswerPayload `json:"answers"`
}

// Heartbeat & Anti-Cheat Violation Event
type ViolationType string

const (
	ViolationTabSwitch   ViolationType = "TAB_SWITCH"
	ViolationFullscreen  ViolationType = "FULLSCREEN_EXIT"
	ViolationDevtools    ViolationType = "DEVTOOLS_OPEN"
	ViolationDualMonitor ViolationType = "DUAL_MONITOR"
)

type HeartbeatPayload struct {
	ExamID        string    `json:"exam_id"`
	UserID        string    `json:"user_id"`
	CurrentNumber int       `json:"current_number"`
	BatteryLevel  float32   `json:"battery_level,omitempty"`
	Timestamp     time.Time `json:"timestamp"`
}

type ViolationPayload struct {
	ExamID    string        `json:"exam_id"`
	UserID    string        `json:"user_id"`
	Type      ViolationType `json:"type"`
	Details   string        `json:"details"`
	Timestamp time.Time     `json:"timestamp"`
}

// Auth DTOs
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	User      User      `json:"user"`
}
