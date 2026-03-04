package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/edulms/auth-service/internal/config"
	"github.com/edulms/auth-service/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo  *repository.AuthRepository
	redis *redis.Client
	cfg   *config.Config
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	RoleID   string `json:"role_id"`
	jwt.RegisteredClaims
}

func NewAuthService(repo *repository.AuthRepository, redis *redis.Client, cfg *config.Config) *AuthService {
	return &AuthService{repo: repo, redis: redis, cfg: cfg}
}

func (s *AuthService) Register(email, password, firstName, lastName string) (*repository.User, *TokenPair, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}

	user, err := s.repo.CreateUser(email, string(hash), firstName, lastName)
	if err != nil {
		return nil, nil, err
	}

	tokens, err := s.generateTokens(user)
	if err != nil {
		return nil, nil, err
	}

	return user, tokens, nil
}

func (s *AuthService) Login(email, password, userAgent, ipAddress string) (*repository.User, *TokenPair, error) {
	user, err := s.repo.GetUserByEmail(email)
	if err != nil {
		return nil, nil, errors.New("invalid credentials")
	}

	if !user.IsActive {
		return nil, nil, errors.New("account is deactivated")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, errors.New("invalid credentials")
	}

	tokens, err := s.generateTokens(user)
	if err != nil {
		return nil, nil, err
	}

	refreshExpiry, _ := time.ParseDuration(s.cfg.JWTRefreshExpiry)
	_, err = s.repo.CreateSession(user.ID, tokens.RefreshToken, userAgent, ipAddress, time.Now().Add(refreshExpiry))
	if err != nil {
		return nil, nil, err
	}

	s.repo.UpdateLastLogin(user.ID)

	sessionTimeout, _ := time.ParseDuration(s.cfg.SessionTimeout)
	s.redis.Set(context.Background(), fmt.Sprintf("session:%s", user.ID), "active", sessionTimeout)

	return user, tokens, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*TokenPair, error) {
	session, err := s.repo.GetSessionByToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	if time.Now().After(session.ExpiresAt) {
		s.repo.DeleteSession(session.ID)
		return nil, errors.New("refresh token expired")
	}

	user, err := s.repo.GetUserByID(session.UserID)
	if err != nil {
		return nil, err
	}

	s.repo.DeleteSession(session.ID)

	tokens, err := s.generateTokens(user)
	if err != nil {
		return nil, err
	}

	refreshExpiry, _ := time.ParseDuration(s.cfg.JWTRefreshExpiry)
	_, err = s.repo.CreateSession(user.ID, tokens.RefreshToken, session.UserAgent, session.IPAddress, time.Now().Add(refreshExpiry))
	if err != nil {
		return nil, err
	}

	return tokens, nil
}

func (s *AuthService) Logout(userID string) error {
	s.repo.DeleteUserSessions(userID)
	s.redis.Del(context.Background(), fmt.Sprintf("session:%s", userID))
	return nil
}

func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func (s *AuthService) GetUserByID(id string) (*repository.User, error) {
	return s.repo.GetUserByID(id)
}

func (s *AuthService) GetUserPermissions(roleID string) ([]string, error) {
	return s.repo.GetUserPermissions(roleID)
}

func (s *AuthService) generateTokens(user *repository.User) (*TokenPair, error) {
	accessExpiry, _ := time.ParseDuration(s.cfg.JWTAccessExpiry)

	roleID := ""
	if user.RoleID != nil {
		roleID = *user.RoleID
	}

	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.RoleName,
		RoleID: roleID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(accessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessToken, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	refreshBytes := make([]byte, 32)
	rand.Read(refreshBytes)
	refreshToken := hex.EncodeToString(refreshBytes)

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(accessExpiry.Seconds()),
	}, nil
}
