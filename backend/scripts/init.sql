-- High-Concurrency CBT Database Schema & Seed Data (PostgreSQL 15+)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT', -- 'STUDENT', 'ADMIN', 'PROCTOR'
    school VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Exams Table
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 60,
    passing_score NUMERIC(5,2) NOT NULL DEFAULT 75.00,
    total_questions INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    randomize_order BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_media TEXT,
    options JSONB NOT NULL, -- Array of {key: "A", text: "..."}
    correct_key VARCHAR(10) NOT NULL, -- "A", "B", "C", "D", "E"
    weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id, number);

-- 4. Exam Sessions Table
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS', -- 'IN_PROGRESS', 'SUBMITTED', 'DISQUALIFIED'
    violation_count INT NOT NULL DEFAULT 0,
    final_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_session_exam_user UNIQUE(exam_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_exam_status ON exam_sessions(exam_id, status);

-- 5. Exam Answers Table (Target for Write-Behind Batch Upsert)
CREATE TABLE IF NOT EXISTS exam_answers (
    exam_id UUID NOT NULL,
    user_id UUID NOT NULL,
    question_id UUID NOT NULL,
    selected_option VARCHAR(10) NOT NULL,
    is_doubt BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (exam_id, user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_user ON exam_answers(exam_id, user_id);

-- 6. Audit & Proctoring Violations Table
CREATE TABLE IF NOT EXISTS audit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'TAB_SWITCH', 'FULLSCREEN_EXIT', etc.
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_exam_user ON audit_violations(exam_id, user_id);

-- SEED DATA
-- Default password for all seed accounts: "password123" ($2a$10$7I66u2p2wL4w5qL65QW4Ce2/QZg2mQ5Ue0kMceWomRk/w1P9hQvVy)
INSERT INTO users (id, username, full_name, password_hash, role, school)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin', 'Administrator CBT', '$2a$10$oY75u9aQ8uW87XN/h123.e10tYJ5tLz9.uK98xK1bQv3kO18G2L8W', 'ADMIN', 'Pusat Asesmen Nasional'),
    ('a0000000-0000-0000-0000-000000000002', 'siswa01', 'Ahmad Pratama', '$2a$10$oY75u9aQ8uW87XN/h123.e10tYJ5tLz9.uK98xK1bQv3kO18G2L8W', 'STUDENT', 'SMA Negeri 1 Jakarta'),
    ('a0000000-0000-0000-0000-000000000003', 'siswa02', 'Budi Santoso', '$2a$10$oY75u9aQ8uW87XN/h123.e10tYJ5tLz9.uK98xK1bQv3kO18G2L8W', 'STUDENT', 'SMA Negeri 1 Jakarta')
ON CONFLICT (username) DO NOTHING;

-- Seed Sample Exam
INSERT INTO exams (id, title, description, duration_minutes, passing_score, total_questions, status, randomize_order)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'Simulasi Ujian Nasional Berbasis Komputer (CBT)',
    'Ujian Kemampuan Literasi, Numerasi & Penalaran Tingkat Lanjut. Durasi: 90 Menit.',
    90,
    75.00,
    5,
    'PUBLISHED',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- Seed Sample Questions
INSERT INTO questions (id, exam_id, number, question_text, options, correct_key, weight)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    1,
    '<p>Dalam arsitektur sistem dengan concurrency tinggi (>15.000 user bersamaan), strategi paling efektif untuk mencegah <i>database bottleneck</i> saat peserta menyimpan jawaban adalah...</p>',
    '[
        {"key": "A", "text": "Melakukan synchronous insert langsung ke database utama pada setiap klik"},
        {"key": "B", "text": "Menggunakan Write-Behind Caching (Redis Buffer) lalu batch ingest asinkron ke database"},
        {"key": "C", "text": "Menambah koneksi database hingga 15.000 connection pool langsung"},
        {"key": "D", "text": "Menyimpan jawaban hanya di browser tanpa mengirimkannya ke server"}
    ]'::jsonb,
    'B',
    1.00
),
(
    'b0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    2,
    '<p>Apa keuntungan utama menerapkan <b>Offline-First IndexedDB</b> pada sisi frontend peserta ujian CBT?</p>',
    '[
        {"key": "A", "text": "Peserta tetap dapat melanjutkan pengerjaan tanpa macet saat jaringan internet fluktuatif"},
        {"key": "B", "text": "Browser tidak perlu merender komponen UI"},
        {"key": "C", "text": "Mencegah peserta menutup browser secara paksa"},
        {"key": "D", "text": "Otomatis mengisi jawaban yang benar jika kehabisan waktu"}
    ]'::jsonb,
    'A',
    1.00
),
(
    'b0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    3,
    '<p>Jika f(x) = 3x² + 4x - 5, maka nilai turunan pertama f''(2) adalah...</p>',
    '[
        {"key": "A", "text": "12"},
        {"key": "B", "text": "14"},
        {"key": "C", "text": "16"},
        {"key": "D", "text": "18"}
    ]'::jsonb,
    'C',
    1.00
),
(
    'b0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000001',
    4,
    '<p>Mengapa Web Worker digunakan untuk countdown timer pada aplikasi CBT online?</p>',
    '[
        {"key": "A", "text": "Web Worker tidak terpengaruh oleh event loop freeze dan tab throttling di browser"},
        {"key": "B", "text": "Web Worker bisa mengakses database server secara langsung"},
        {"key": "C", "text": "Web Worker mencegah inspeksi Element dan DevTools"},
        {"key": "D", "text": "Web Worker mempercepat koneksi internet peserta"}
    ]'::jsonb,
    'A',
    1.00
),
(
    'b0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000001',
    5,
    '<p>Protokol transport apa yang paling direkomendasikan pada level CDN/Load Balancer untuk mengurangi latensi handshake 15.000 peserta secara serentak?</p>',
    '[
        {"key": "A", "text": "HTTP/1.0"},
        {"key": "B", "text": "HTTP/2 & HTTP/3 (QUIC)"},
        {"key": "C", "text": "Telnet"},
        {"key": "D", "text": "FTP"}
    ]'::jsonb,
    'B',
    1.00
)
ON CONFLICT (id) DO NOTHING;
