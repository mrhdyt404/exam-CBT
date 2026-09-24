package handler

import (
	"github.com/gofiber/fiber/v2"
	"ujiancbt/backend/internal/service"
)

type ExamHandler struct {
	examService *service.ExamService
}

func NewExamHandler(examService *service.ExamService) *ExamHandler {
	return &ExamHandler{examService: examService}
}

// Get Exam Question Bundle (High-Performance Cached)
func (h *ExamHandler) GetBundle(c *fiber.Ctx) error {
	examID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)

	if examID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam id is required"})
	}

	bundle, err := h.examService.GetExamBundle(c.Context(), examID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Cache header for browser/CDN optimization with ETag support
	if bundle.BundleHash != "" {
		c.Set("ETag", `"`+bundle.BundleHash+`"`)
		if c.Get("If-None-Match") == `"`+bundle.BundleHash+`"` {
			return c.SendStatus(fiber.StatusNotModified)
		}
	}

	return c.Status(fiber.StatusOK).JSON(bundle)
}

// Start or Resume Exam Session
func (h *ExamHandler) StartSession(c *fiber.Ctx) error {
	examID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)

	if examID == "" || userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam id and auth required"})
	}

	session, answers, err := h.examService.StartExamSession(c.Context(), examID, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"session": session,
		"answers": answers,
	})
}

// Final Exam Submission
func (h *ExamHandler) SubmitExam(c *fiber.Ctx) error {
	examID := c.Params("id")
	userID, _ := c.Locals("user_id").(string)

	if examID == "" || userID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "exam id and auth required"})
	}

	score, err := h.examService.SubmitExam(c.Context(), examID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":     "Exam submitted successfully",
		"final_score": score,
	})
}
