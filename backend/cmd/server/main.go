package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"ujiancbt/backend/internal/config"
	"ujiancbt/backend/internal/handler"
	"ujiancbt/backend/internal/middleware"
	"ujiancbt/backend/internal/repository"
	"ujiancbt/backend/internal/service"
)

func main() {
	// 1. Load Configurations
	cfg := config.LoadConfig()
	log.Printf("[INIT] Starting CBT Engine on port %s in %s mode...", cfg.AppPort, cfg.AppEnv)

	// 2. Initialize Repositories (Postgres Pool & Redis Pool)
	pgRepo, err := repository.NewPostgresRepository(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Postgres init failed: %v", err)
	}
	defer pgRepo.Close()

	redisRepo, err := repository.NewRedisRepository(cfg)
	if err != nil {
		log.Fatalf("[FATAL] Redis init failed: %v", err)
	}
	defer redisRepo.Close()

	// 3. Initialize Services
	authService := service.NewAuthService(cfg, pgRepo, redisRepo)
	examService := service.NewExamService(pgRepo, redisRepo)
	answerService := service.NewAnswerService(redisRepo)
	proctorService := service.NewProctorService(pgRepo, redisRepo)

	// 4. Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	examHandler := handler.NewExamHandler(examService)
	answerHandler := handler.NewAnswerHandler(answerService)
	proctorHandler := handler.NewProctorHandler(proctorService)

	// 5. Initialize Fiber App with performance tuning
	app := fiber.New(fiber.Config{
		Prefork:       false, // set to true if running bare-metal multiple CPU cores
		CaseSensitive: true,
		StrictRouting: true,
		ServerHeader:  "CBT-HighConcurrency-Engine",
		ReadTimeout:   10 * time.Second,
		WriteTimeout:  10 * time.Second,
		IdleTimeout:   120 * time.Second,
		Concurrency:   256 * 1024, // 256k concurrent goroutines buffer
	})

	// Middlewares
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, If-None-Match",
		AllowMethods: "GET, POST, HEAD, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Health Check & SLA Ping
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":    "healthy",
			"timestamp": time.Now().Unix(),
			"engine":    "go-fiber-cbt-v1",
		})
	})

	// API Routing
	api := app.Group("/api/v1")

	// Public Auth Routes
	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	// Protected Routes (JWT Required)
	authMiddleware := middleware.NewAuthMiddleware(authService)

	user := api.Group("/user", authMiddleware)
	user.Get("/me", authHandler.Me)

	// Exam Engine Routes
	exam := api.Group("/exam", authMiddleware)
	exam.Get("/:id/bundle", examHandler.GetBundle)
	exam.Post("/:id/start", examHandler.StartSession)
	exam.Post("/:id/submit", examHandler.SubmitExam)

	// Answer Ingestion (Ultra-Low Latency)
	answer := api.Group("/answer", authMiddleware)
	answer.Post("/save", answerHandler.SaveAnswer)
	answer.Post("/sync-batch", answerHandler.SyncBatchAnswers)

	// Proctoring & Live Heartbeat
	proctor := api.Group("/proctor", authMiddleware)
	proctor.Post("/heartbeat", proctorHandler.Heartbeat)
	proctor.Post("/violation", proctorHandler.ReportViolation)
	proctor.Get("/:id/live-metrics", proctorHandler.GetLiveMetrics)

	// 6. Graceful Shutdown listener
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("[INFO] Gracefully shutting down CBT Engine...")
		_ = app.Shutdown()
	}()

	// 7. Start Listening
	addr := ":" + cfg.AppPort
	if err := app.Listen(addr); err != nil {
		log.Printf("[INFO] Server terminated: %v", err)
	}
}
