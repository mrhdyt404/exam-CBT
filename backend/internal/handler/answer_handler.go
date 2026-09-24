package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/service"
)

type AnswerHandler struct {
	answerService *service.AnswerService
}

func NewAnswerHandler(answerService *service.AnswerService) *AnswerHandler {
	return &AnswerHandler{answerService: answerService}
}

// Sub-millisecond save answer
func (h *AnswerHandler) SaveAnswer(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)

	var payload domain.AnswerPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	payload.UserID = userID
	if payload.Timestamp.IsZero() {
		payload.Timestamp = time.Now()
	}

	if payload.ExamID == "" || payload.QuestionID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id and question_id required"})
	}

	if err := h.answerService.SaveAnswer(c.Context(), payload); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed saving answer"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status":    "saved",
		"timestamp": payload.Timestamp,
	})
}

// Batch Sync for client reconnection
func (h *AnswerHandler) SyncBatchAnswers(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)

	var batch domain.BatchAnswerPayload
	if err := c.BodyParser(&batch); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	if batch.ExamID == "" || len(batch.Answers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam_id and answers required"})
	}

	if err := h.answerService.SaveBatchAnswers(c.Context(), batch, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed syncing answers"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"status": "synced",
		"count":  len(batch.Answers),
	})
}
