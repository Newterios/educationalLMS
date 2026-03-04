package repository

import (
	"database/sql"
	"time"
	"github.com/google/uuid"
)

type User struct {
	ID            string    `json:"id"`
	Email         string    `json:"email"`
	PasswordHash  string    `json:"-"`
	FirstName     string    `json:"first_name"`
	LastName      string    `json:"last_name"`
	MiddleName    *string   `json:"middle_name,omitempty"`
	AvatarURL     *string   `json:"avatar_url,omitempty"`
	Phone         *string   `json:"phone,omitempty"`
	RoleID        *string   `json:"role_id,omitempty"`
	RoleName      string    `json:"role_name,omitempty"`
	OrgID         *string   `json:"organization_id,omitempty"`
	Language      string    `json:"language"`
	Theme         string    `json:"theme"`
	IsActive      bool      `json:"is_active"`
	EmailVerified bool      `json:"email_verified"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type Session struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	RefreshToken string    `json:"refresh_token"`
	UserAgent    string    `json:"user_agent"`
	IPAddress    string    `json:"ip_address"`
	ExpiresAt    time.Time `json:"expires_at"`
	CreatedAt    time.Time `json:"created_at"`
}

type AuthRepository struct {
	db *sql.DB
}

func NewAuthRepository(db *sql.DB) *AuthRepository {
	return &AuthRepository{db: db}
}

func (r *AuthRepository) CreateUser(email, passwordHash, firstName, lastName string) (*User, error) {
	id := uuid.New().String()

	var studentRoleID string
	err := r.db.QueryRow("SELECT id FROM roles WHERE name = 'student'").Scan(&studentRoleID)
	if err != nil {
		return nil, err
	}

	user := &User{}
	err = r.db.QueryRow(
		`INSERT INTO users (id, email, password_hash, first_name, last_name, role_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, email, first_name, last_name, language, theme, is_active, email_verified, created_at, updated_at`,
		id, email, passwordHash, firstName, lastName, studentRoleID,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.Language, &user.Theme, &user.IsActive, &user.EmailVerified,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}

	user.RoleName = "student"
	return user, nil
}

func (r *AuthRepository) GetUserByEmail(email string) (*User, error) {
	user := &User{}
	err := r.db.QueryRow(
		`SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.middle_name,
		u.avatar_url, u.phone, u.role_id, COALESCE(r.name, ''), u.organization_id,
		u.language, u.theme, u.is_active, u.email_verified, u.created_at, u.updated_at
		FROM users u LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.email = $1`,
		email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.MiddleName, &user.AvatarURL, &user.Phone, &user.RoleID, &user.RoleName,
		&user.OrgID, &user.Language, &user.Theme, &user.IsActive, &user.EmailVerified,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *AuthRepository) GetUserByID(id string) (*User, error) {
	user := &User{}
	err := r.db.QueryRow(
		`SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.middle_name,
		u.avatar_url, u.phone, u.role_id, COALESCE(r.name, ''), u.organization_id,
		u.language, u.theme, u.is_active, u.email_verified, u.created_at, u.updated_at
		FROM users u LEFT JOIN roles r ON u.role_id = r.id
		WHERE u.id = $1`,
		id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FirstName, &user.LastName,
		&user.MiddleName, &user.AvatarURL, &user.Phone, &user.RoleID, &user.RoleName,
		&user.OrgID, &user.Language, &user.Theme, &user.IsActive, &user.EmailVerified,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *AuthRepository) CreateSession(userID, refreshToken, userAgent, ipAddress string, expiresAt time.Time) (*Session, error) {
	session := &Session{}
	id := uuid.New().String()
	err := r.db.QueryRow(
		`INSERT INTO sessions (id, user_id, refresh_token, user_agent, ip_address, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, refresh_token, user_agent, ip_address, expires_at, created_at`,
		id, userID, refreshToken, userAgent, ipAddress, expiresAt,
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.UserAgent,
		&session.IPAddress, &session.ExpiresAt, &session.CreatedAt)

	if err != nil {
		return nil, err
	}
	return session, nil
}

func (r *AuthRepository) GetSessionByToken(refreshToken string) (*Session, error) {
	session := &Session{}
	err := r.db.QueryRow(
		`SELECT id, user_id, refresh_token, user_agent, ip_address, expires_at, created_at
		FROM sessions WHERE refresh_token = $1`,
		refreshToken,
	).Scan(&session.ID, &session.UserID, &session.RefreshToken, &session.UserAgent,
		&session.IPAddress, &session.ExpiresAt, &session.CreatedAt)

	if err != nil {
		return nil, err
	}
	return session, nil
}

func (r *AuthRepository) DeleteSession(id string) error {
	_, err := r.db.Exec("DELETE FROM sessions WHERE id = $1", id)
	return err
}

func (r *AuthRepository) DeleteUserSessions(userID string) error {
	_, err := r.db.Exec("DELETE FROM sessions WHERE user_id = $1", userID)
	return err
}

func (r *AuthRepository) UpdateLastLogin(userID string) error {
	_, err := r.db.Exec("UPDATE users SET last_login_at = NOW() WHERE id = $1", userID)
	return err
}

func (r *AuthRepository) GetUserPermissions(roleID string) ([]string, error) {
	rows, err := r.db.Query(
		`SELECT p.code FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		WHERE rp.role_id = $1`,
		roleID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var permissions []string
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		permissions = append(permissions, code)
	}
	return permissions, nil
}
