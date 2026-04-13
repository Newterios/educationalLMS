package handler

import (
	"net/http"
	"strings"

	"github.com/edulms/auth-service/internal/service"
	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	svc *service.AuthService
}

type RegisterRequest struct {
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"first_name" binding:"required"`
	LastName  string `json:"last_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "auth-service"})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, tokens, err := h.svc.Register(req.Email, req.Password, req.FirstName, req.LastName)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":   user,
		"tokens": tokens,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, tokens, err := h.svc.Login(req.Email, req.Password, c.GetHeader("User-Agent"), c.ClientIP())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var permissions []string
	if user.RoleID != nil {
		permissions, _ = h.svc.GetUserPermissions(*user.RoleID)
	}

	c.JSON(http.StatusOK, gin.H{
		"user":        user,
		"tokens":      tokens,
		"permissions": permissions,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tokens, err := h.svc.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tokens": tokens})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	claims, err := h.extractClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	h.svc.Logout(claims.UserID)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	claims, err := h.extractClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.svc.GetUserByID(claims.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	var permissions []string
	if user.RoleID != nil {
		permissions, _ = h.svc.GetUserPermissions(*user.RoleID)
	}

	c.JSON(http.StatusOK, gin.H{
		"user":        user,
		"permissions": permissions,
	})
}

func (h *AuthHandler) ValidateToken(c *gin.Context) {
	claims, err := h.extractClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"valid": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":   true,
		"user_id": claims.UserID,
		"email":   claims.Email,
		"role":    claims.Role,
		"role_id": claims.RoleID,
	})
}

func (h *AuthHandler) ValidateAdmin(c *gin.Context) {
	claims, err := h.extractClaims(c)
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	if claims.Role != "superadmin" {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	c.Status(http.StatusOK)
}

func (h *AuthHandler) extractClaims(c *gin.Context) (*service.Claims, error) {
	auth := c.GetHeader("Authorization")
	if auth == "" {
		return nil, http.ErrNoCookie
	}

	token := strings.TrimPrefix(auth, "Bearer ")
	return h.svc.ValidateToken(token)
}
