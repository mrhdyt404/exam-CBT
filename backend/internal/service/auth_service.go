package service

import (
	"context"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"ujiancbt/backend/internal/config"
	"ujiancbt/backend/internal/domain"
	"ujiancbt/backend/internal/repository"
)

type AuthService struct {
	cfg        *config.Config
	pgRepo     *repository.PostgresRepository
	redisRepo  *repository.RedisRepository
}

type JWTClaims struct {
	UserID   string      `json:"user_id"`
	Username string      `json:"username"`
	Role     domain.Role `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(cfg *config.Config, pg *repository.PostgresRepository, rds *repository.RedisRepository) *AuthService {
	return &AuthService{
		cfg:       cfg,
		pgRepo:    pg,
		redisRepo: rds,
	}
}

func (s *AuthService) Login(ctx context.Context, req domain.LoginRequest) (*domain.LoginResponse, error) {
	user, err := s.pgRepo.GetUserByUsername(ctx, req.Username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	expiresAt := time.Now().Add(s.cfg.JWTExpiration)
	claims := JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "ujiancbt-engine",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Enforce single active session in Redis
	_ = s.redisRepo.SetUserSession(ctx, user.ID, tokenString, s.cfg.JWTExpiration)

	return &domain.LoginResponse{
		Token:     tokenString,
		ExpiresAt: expiresAt,
		User:      *user,
	}, nil
}

func (s *AuthService) ValidateToken(ctx context.Context, tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok {
		return nil, errors.New("cannot parse claims")
	}

	// Verify if token is current active session
	activeToken, err := s.redisRepo.GetUserSession(ctx, claims.UserID)
	if err == nil && activeToken != "" && activeToken != tokenString {
		return nil, errors.New("session terminated: user logged in from another device")
	}

	return claims, nil
}
