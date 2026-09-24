package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/service"
)

type ProctorHandler struct {
	proctorService *service.ProctorService
}

func NewProctorHandler(proctorService *service.ProctorService) *ProctorHandler {
	return &ProctorHandler{proctorService: proctorService}
}

// Lightweight Heartbeat Endpoint
func (h *ProctorHandler) Heartbeat(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)

	var payload domain.HeartbeatPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	payload.UserID = userID
	payload.Timestamp = time.Now()

	if payload.ExamID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id required"})
	}

	_ = h.proctorService.HandleHeartbeat(c.Context(), payload)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "alive"})
}

// Anti-Cheat Violation Event (Tab Switch, Fullscreen Exit)
func (h *ProctorHandler) ReportViolation(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)

	var payload domain.ViolationPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	payload.UserID = userID
	payload.Timestamp = time.Now()

	if payload.ExamID == "" || payload.Type == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id and type required"})
	}

	_ = h.proctorService.LogViolation(c.Context(), payload)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "recorded"})
}

// Admin / Proctor Live Metrics
func (h *ProctorHandler) GetLiveMetrics(c *fiber.Ctx) error {
	examID := c.Params("id")
	if examID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id required"})
	}

	activeCount, err := h.proctorService.GetLiveParticipantCount(c.Context(), examID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"exam_id":            examID,
		"active_participants": activeCount,
	})
}
