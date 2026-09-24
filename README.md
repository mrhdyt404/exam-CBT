# 🚀 High-Concurrency Computer Based Testing (CBT) System
### *Enterprise Scale Online Examination Platform Designed for 15,000++ Concurrent Test Takers*

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?style=flat&logo=redis)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistem Ujian Berbasis Komputer (**Computer-Based Testing / CBT**) berskala nasional yang dirancang khusus untuk menangani beban konkurensi ekstrem (**15.000+ peserta bersamaan**) dengan arsitektur **Offline-First**, **Write-Behind In-Memory Caching (Redis to PostgreSQL)**, **Web Worker Countdown Timer**, dan sistem pengawasan integritas **Anti-Cheat Proctoring**.

---

## 📑 Daftar Isi
1. [Arsitektur Sistem & Data Flow](#-1-arsitektur-sistem--data-flow)
2. [Strategi Rekayasa High-Concurrency](#-2-strategi-rekayasa-high-concurrency)
3. [Tech Stack](#-3-tech-stack)
4. [Struktur Direktori Project](#-4-struktur-direktori-project)
5. [Panduan Instalasi & Menjalankan Sistem](#-5-panduan-instalasi--menjalankan-sistem)
6. [API Endpoints & Kontrak Data](#-6-api-endpoints--kontrak-data)
7. [Pengujian Beban & Benchmark (k6)](#-7-pengujian-beban--benchmark-k6)
8. [Akun Demo & Akses Pengujian](#-8-akun-demo--akses-pengujian)
9. [Deployment & Production Checklist](#-9-deployment--production-checklist)

---

## 🏛️ 1. Arsitektur Sistem & Data Flow

```
                     [ 15.000++ Peserta Ujian Serentak ]
                                     │
                                     ▼ (HTTPS / HTTP2 - WAF Layer)
            ┌────────────────────────────────────────────────────────┐
            │  Cloudflare / Reverse Proxy Edge Layer                 │
            │  - Static Asset Caching (Next.js Chunks, CSS, Media)   │
            │  - Edge Rate Limiting & Bot Protection                │
            └────────────────────────────────────────────────────────┘
                                     │
                                     ▼
            ┌────────────────────────────────────────────────────────┐
            │  NGINX Load Balancer & Ingress Gateway                 │
            │  - SSL Termination & Keep-Alive Connection Pool       │
            │  - Reverse Proxy (Least Connections Distribution)      │
            └────────────────────────────────────────────────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
┌─────────────────────────┐                     ┌───────────────────────────────┐
│ Next.js 14 Frontend     │                     │ Go Fiber v2 API Engine        │
│ - Offline-First Dexie   │                     │ - Zero-Allocation Routing     │
│ - Web Worker Timer      │                     │ - Stateless JWT Validation    │
│ - Anti-Cheat Proctoring │                     │ - Sub-Millisecond Ingestion   │
└─────────────────────────┘                     └───────────────────────────────┘
                                                                │
                                     ┌──────────────────────────┴──────────────────────────┐
                                     ▼ (Sub-ms writes)                                     ▼
                      ┌──────────────────────────────────────┐                   ┌────────────────────────┐
                      │ Redis 7 In-Memory Hot State Cluster  │                   │ Object Storage / Local │
                      │ - Hashes `answers:{exam_id}:{user}`  │                   │ - Media Gambar & Audio │
                      │ - Redis Streams `stream:cbt:answers` │                   │ - Webcam Audit Logs    │
                      │ - Sorted Sets `heartbeat:{exam_id}`  │                   └────────────────────────┘
                      └──────────────────────────────────────┘
                                     │
                                     ▼ (Asynchronous Batch Ingest)
                      ┌──────────────────────────────────────┐
                      │ Go Asynchronous Write-Behind Worker  │
                      │ - Bulk Batch Upsert (500 items/batch)│
                      │ - Database Lock Avoidance            │
                      └──────────────────────────────────────┘
                                     │
                                     ▼
                      ┌──────────────────────────────────────┐
                      │ PostgreSQL 16 Primary Database       │
                      │ - Connection Pooling via pgxpool     │
                      │ - Partition-Ready Relational Schema  │
                      └──────────────────────────────────────┘
```

---

## ⚡ 2. Strategi Rekayasa High-Concurrency

### 1. Thundering Herd Problem Mitigation
- Seluruh paket soal di-generate dan di-cache dalam **Redis In-Memory** dengan validasi header `ETag` dan `If-None-Match`.
- 15.000 peserta mengunduh soal secara serentak dari cache memori tanpa melakukan *heavy query* ke database PostgreSQL.

### 2. Write-Behind Caching Pattern
- Setiap interaksi siswa memilih jawaban dikirim ke Go API dan langsung dicatat ke **Redis Stream** & **Redis Hash** dengan latensi **< 1 milidetik**.
- Komponen terpisah (**Go Background Worker**) mengonsumsi stream dan melakukan eksekusi *bulk upsert batch* (500 item per transaksi) ke PostgreSQL secara periodik, mengeliminasi risiko *row lock contention* dan *connection exhaustion*.

### 3. Client-Side Offline-First Resilience
- Frontend dilengkapi penyimpanan lokal berbasis **IndexedDB (Dexie.js)**.
- Jika koneksi internet peserta mengalami gangguan di tengah ujian, siswa tetap dapat melanjutkan pengisian soal tanpa hambatan.
- Saat jaringan pulih, antrean jawaban lokal otomatis disinkronkan ke server secara bertahap (*auto-sync with exponential backoff*).

### 4. Web Worker Independent Countdown Timer
- Timer ujian dijalankan pada thread terpisah menggunakan **HTML5 Web Workers**.
- Menjamin akurasi waktu ujian tetap 100% tepat dan tidak terpengaruh oleh *tab throttling*, *UI thread freezing*, maupun *minimized browser window*.

### 5. Anti-Cheat & Proctoring Engine
- **Enforced Fullscreen**: Memaksa mode layar penuh saat ujian aktif.
- **Tab Switching & Blur Detection**: Mendeteksi jika siswa berpindah aplikasi atau tab browser, mencatat riwayat pelanggaran secara real-time.
- **Shortcut & Context Menu Blocking**: Memblokir tombol `F12`, `Ctrl+Shift+I`, `Ctrl+U`, klik kanan *Inspect Element*, dan shortcut developer tool lainnya.
- **Heartbeat Ping**: Melacak status keaktifan peserta setiap interval tertentu untuk monitoring pengawas.

---

## 🛠️ 3. Tech Stack

| Layer | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Backend API** | **Go 1.22+ & Fiber v2** | High-performance, zero-allocation HTTP engine |
| **Async Worker** | **Go Concurrency & Goroutines** | Bulk batch processor for database write-behind |
| **Database** | **PostgreSQL 16** | Relational primary storage with `pgxpool` |
| **In-Memory Cache** | **Redis 7** | In-memory session, streams, hashes & caching |
| **Frontend Web** | **Next.js 14 (App Router) + React** | Server & client rendered responsive interface |
| **Client Storage** | **IndexedDB (Dexie.js)** | Offline-first local database caching |
| **Styling** | **Tailwind CSS + PostCSS** | Modern utility-first UI design system |
| **Load Balancer** | **NGINX / Apache Reverse Proxy** | SSL termination & reverse proxying |
| **Container** | **Docker & Docker Compose** | Reproducible multi-service deployment |
| **Testing** | **k6 (Grafana)** | High-concurrency load testing & stress benchmarking |

---

## 📁 4. Struktur Direktori Project

```
/var/www/html/ujianCBT/
├── backend/                  # Source code Backend Go Engine
│   ├── cmd/
│   │   ├── server/           # Entry point API Server (cbt-server)
│   │   └── worker/           # Entry point Async Ingestion Worker (cbt-worker)
│   ├── internal/             # Core business logic, config, models, handlers
│   │   ├── config/           # Environment & runtime configuration
│   │   ├── handlers/         # HTTP request handlers (Auth, Exam, Answer, Proctor)
│   │   ├── middleware/       # JWT Auth, Rate Limiter, CORS, Logger
│   │   ├── models/           # Data structs & database entities
│   │   ├── repository/       # PostgreSQL & Redis query implementations
│   │   └── services/         # Exam evaluation, sync & proctoring services
│   ├── scripts/              # k6 load testing & database migration scripts
│   ├── Dockerfile.server     # Docker image API server
│   ├── Dockerfile.worker     # Docker image background worker
│   ├── go.mod                # Go module definition
│   └── go.sum                # Go checksum dependencies
├── frontend/                 # Source code Frontend Next.js 14
│   ├── src/
│   │   ├── app/              # Next.js App Router (Login, Exam Portal, Admin Monitor)
│   │   ├── components/       # UI Components (QuestionCard, Timer, NavigationGrid, ProctorAlert)
│   │   ├── lib/              # Dexie DB, Web Worker, API Client
│   │   └── types/            # TypeScript interfaces
│   ├── public/               # Static assets & Web Worker scripts
│   ├── package.json          # Node dependencies
│   ├── tailwind.config.js    # Tailwind configuration
│   └── tsconfig.json         # TypeScript configuration
├── deploy/                   # Configuration deployment & Nginx reverse proxy
│   └── nginx/                # Nginx virtual host & load balancing configs
├── docker-compose.yml        # Multi-container orchestration (App, DB, Redis, Worker, Nginx)
├── ecosystem.config.js       # PM2 Process Manager configuration
└── README.md                 # Dokumentasi komprehensif sistem
```

---

## 🚀 5. Panduan Instalasi & Menjalankan Sistem

### Persyaratan Sistem
- **Docker & Docker Compose** (versi 24.x+)
- **Atau manual**: Go 1.22+, Node.js 18/20+, PostgreSQL 16, Redis 7.

---

### Opsi 1: Menjalankan dengan Docker Compose (Sangat Direkomendasikan)

1. **Clone repository**:
   ```bash
   git clone https://github.com/mrhdyt404/exam-CBT.git
   cd exam-CBT
   ```

2. **Jalankan semua container (API, Frontend, Worker, Postgres, Redis, Nginx)**:
   ```bash
   docker compose up -d --build
   ```

3. **Verifikasi status container**:
   ```bash
   docker compose ps
   ```

4. **Akses Layanan**:
   - **Portal Peserta Ujian**: `http://localhost` (atau `http://localhost:3000`)
   - **Health Check API**: `http://localhost/healthz`
   - **Dashboard Pengawas**: `http://localhost/admin/monitor`

---

### Opsi 2: Menjalankan Bare-Metal / Native

#### 1. Setup Database & Redis
```bash
docker compose up -d postgres redis
```

#### 2. Jalankan Backend API Server (Go)
```bash
cd backend
go build -o cbt-server cmd/server/main.go
./cbt-server
```

#### 3. Jalankan Background Worker (Go)
```bash
cd backend
go build -o cbt-worker cmd/worker/main.go
./cbt-worker
```

#### 4. Jalankan Frontend (Next.js)
```bash
cd frontend
npm install
npm run build
npm run start
```

---

## 🔌 6. API Endpoints & Kontrak Data

### Autentikasi
- `POST /api/v1/auth/login` - Login peserta / pengawas, mengembalikan JWT Token.
- `POST /api/v1/auth/logout` - Invalidate session token.

### Ujian & Soal
- `GET /api/v1/exams/:id/package` - Mengambil bundle paket soal (Cached via Redis/ETag).
- `POST /api/v1/exams/:id/start` - Memulai sesi ujian dan inisialisasi status peserta.
- `POST /api/v1/exams/:id/answers` - Mengirim jawaban (Sub-ms ingestion ke Redis Streams).
- `POST /api/v1/exams/:id/submit` - Menyelesaikan ujian dan memicu evaluasi otomatis.

### Pengawasan (Proctoring)
- `POST /api/v1/proctor/heartbeat` - Kirim status konektivitas & waktu tersisa.
- `POST /api/v1/proctor/violation` - Laporkan pelanggaran (Tab switch, Fullscreen exit, Devtools).
- `GET /api/v1/admin/proctor/:exam_id/live` - Real-time stream monitoring peserta untuk pengawas.

---

## 🧪 7. Pengujian Beban & Benchmark (k6)

Skrip pengujian beban telah disediakan di [`backend/scripts/k6_load_test.js`](file:///var/www/html/ujianCBT/backend/scripts/k6_load_test.js) untuk mensimulasikan **15.000 Virtual Users (VUs)** yang mengerjakan soal secara bersamaan.

Jalankan pengujian menggunakan **k6**:
```bash
k6 run backend/scripts/k6_load_test.js
```

### Hasil Benchmark Target:
- **Throughput Ingestion Jawaban**: > 25.000 requests/detik
- **P95 Latency**: < 5 milidetik
- **Database CPU Usage**: Stabil di bawah 45% (berkat batch write-behind)
- **HTTP Error Rate**: 0.00%

---

## 🔑 8. Akun Demo & Akses Pengujian

Gunakan akun demo berikut untuk menguji alur kerja ujian:

| Role | Username | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Peserta Ujian 1** | `siswa01` | `password123` | Mengerjakan Ujian, Sync Offline |
| **Peserta Ujian 2** | `siswa02` | `password123` | Mengerjakan Ujian, Sync Offline |
| **Administrator** | `admin` | `password123` | Monitoring Realtime & Audit Log |

---

## 🛡️ 9. Deployment & Production Checklist

- [x] Pastikan port `80` dan `443` terbuka pada firewall server.
- [x] Konfigurasi reverse proxy SSL (Let's Encrypt / Cloudflare SSL).
- [x] Set environment variable production (`NODE_ENV=production`, `GIN_MODE=release`).
- [x] Aktifkan Redis persistence (`appendonly yes`) untuk durabilitas data hot-state.
- [x] Konfigurasi PM2 Process Manager menggunakan [`ecosystem.config.js`](file:///var/www/html/ujianCBT/ecosystem.config.js) untuk auto-restart.

---

## 📄 Lisensi
Project ini didistribusikan di bawah lisensi **MIT License**.

**Dibuat & Dikembangkan oleh [mrhdyt404](https://github.com/mrhdyt404)**
