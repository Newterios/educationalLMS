package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

var db *sql.DB

func main() {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("POSTGRES_HOST", "localhost"),
		getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_USER", "edulms"),
		getEnv("POSTGRES_PASSWORD", "edulms_secret"),
		getEnv("POSTGRES_DB", "edulms"))

	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), corsMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "user-service"})
	})

	r.GET("/profile/:id", getProfile)
	r.PUT("/profile/:id", updateProfile)
	r.GET("/users", listUsers)
	r.GET("/users/:id", getUser)
	r.POST("/users", createUser)
	r.PUT("/users/:id", updateUser)
	r.PUT("/users/:id/role", updateUserRole)
	r.DELETE("/users/:id", deleteUser)

	r.GET("/roles", listRoles)
	r.POST("/roles", createRole)
	r.PUT("/roles/:id", updateRole)
	r.DELETE("/roles/:id", deleteRole)
	r.GET("/roles/:id/permissions", getRolePermissions)
	r.PUT("/roles/:id/permissions", updateRolePermissions)
	r.GET("/permissions", listAllPermissions)

	r.GET("/organizations", listOrganizations)
	r.POST("/organizations", createOrganization)
	r.GET("/faculties", listFaculties)
	r.POST("/faculties", createFaculty)
	r.GET("/departments", listDepartments)
	r.POST("/departments", createDepartment)
	r.GET("/groups", listGroups)
	r.POST("/groups", createGroup)
	r.DELETE("/groups/:id", deleteGroup)
	r.PUT("/users/:id/group", updateUserGroup)

	port := getEnv("PORT", "8002")
	log.Printf("User service starting on port %s", port)
	r.Run(":" + port)
}

func getProfile(c *gin.Context) {
	id := c.Param("id")
	var user struct {
		ID          string    `json:"id"`
		Email       string    `json:"email"`
		FirstName   string    `json:"first_name"`
		LastName    string    `json:"last_name"`
		Middle      *string   `json:"middle_name"`
		Avatar      *string   `json:"avatar_url"`
		Phone       *string   `json:"phone"`
		CountryCode *string   `json:"country_code"`
		BirthDate   *string   `json:"birth_date"`
		IIN         *string   `json:"iin"`
		GroupID     *string   `json:"group_id"`
		GroupName   *string   `json:"group_name"`
		RoleName    string    `json:"role_name"`
		Language    string    `json:"language"`
		Theme       string    `json:"theme"`
		CreatedAt   time.Time `json:"created_at"`
	}
	err := db.QueryRow(
		`SELECT u.id, u.email, u.first_name, u.last_name, u.middle_name, u.avatar_url,
		u.phone, u.country_code, CAST(u.birth_date AS TEXT), u.iin,
		CAST(u.group_id AS TEXT), g.name,
		COALESCE(r.name,''), u.language, u.theme, u.created_at
		FROM users u LEFT JOIN roles r ON u.role_id = r.id
		LEFT JOIN student_groups g ON u.group_id = g.id
		WHERE u.id = $1`, id,
	).Scan(&user.ID, &user.Email, &user.FirstName, &user.LastName, &user.Middle,
		&user.Avatar, &user.Phone, &user.CountryCode, &user.BirthDate, &user.IIN,
		&user.GroupID, &user.GroupName,
		&user.RoleName, &user.Language, &user.Theme, &user.CreatedAt)
	if err != nil {
		c.JSON(404, gin.H{"error": "user not found"})
		return
	}

	// Fetch user permissions via role
	var permissions []string
	permRows, _ := db.Query(
		`SELECT p.code FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		JOIN roles r ON r.id = rp.role_id
		JOIN users u ON u.role_id = r.id
		WHERE u.id = $1`, id)
	if permRows != nil {
		defer permRows.Close()
		for permRows.Next() {
			var code string
			permRows.Scan(&code)
			permissions = append(permissions, code)
		}
	}

	c.JSON(200, gin.H{
		"id": user.ID, "email": user.Email,
		"first_name": user.FirstName, "last_name": user.LastName,
		"middle_name": user.Middle, "avatar_url": user.Avatar,
		"phone": user.Phone, "country_code": user.CountryCode,
		"birth_date": user.BirthDate, "iin": user.IIN,
		"group_id": user.GroupID, "group_name": user.GroupName,
		"role_name": user.RoleName, "language": user.Language,
		"theme": user.Theme, "created_at": user.CreatedAt,
		"permissions": permissions,
	})
}

func updateProfile(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		FirstName   *string `json:"first_name"`
		LastName    *string `json:"last_name"`
		MiddleName  *string `json:"middle_name"`
		Phone       *string `json:"phone"`
		CountryCode *string `json:"country_code"`
		BirthDate   *string `json:"birth_date"`
		IIN         *string `json:"iin"`
		GroupID     *string `json:"group_id"`
		Language    *string `json:"language"`
		Theme       *string `json:"theme"`
		AvatarURL   *string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	_, err := db.Exec(
		`UPDATE users SET
		first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
		middle_name = COALESCE($3, middle_name), phone = COALESCE($4, phone),
		country_code = COALESCE($5, country_code), birth_date = COALESCE($6::date, birth_date),
		iin = COALESCE($7, iin), group_id = COALESCE($8::uuid, group_id),
		language = COALESCE($9, language), theme = COALESCE($10, theme),
		avatar_url = COALESCE($11, avatar_url),
		updated_at = NOW() WHERE id = $12`,
		req.FirstName, req.LastName, req.MiddleName, req.Phone,
		req.CountryCode, req.BirthDate, req.IIN, req.GroupID,
		req.Language, req.Theme, req.AvatarURL, id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "profile updated"})
}

func listUsers(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "100")
	role := c.Query("role")
	groupID := c.Query("group_id")
	search := c.Query("search")

	pageNum := 1
	limitNum := 100
	fmt.Sscanf(pageStr, "%d", &pageNum)
	fmt.Sscanf(limitStr, "%d", &limitNum)
	if pageNum < 1 { pageNum = 1 }
	if limitNum < 1 { limitNum = 100 }
	offset := (pageNum - 1) * limitNum

	query := `SELECT u.id, u.email, u.first_name, u.last_name, COALESCE(r.name,''),
		u.is_active, u.created_at, u.phone, u.country_code, CAST(u.birth_date AS TEXT), u.iin,
		CAST(u.group_id AS TEXT), COALESCE(g.name,'')
		FROM users u LEFT JOIN roles r ON u.role_id = r.id
		LEFT JOIN student_groups g ON u.group_id = g.id
		WHERE 1=1`
	args := []interface{}{}
	argIdx := 1

	if role != "" {
		query += fmt.Sprintf(" AND r.name = $%d", argIdx)
		args = append(args, role)
		argIdx++
	}
	if groupID != "" {
		query += fmt.Sprintf(" AND u.group_id = $%d::uuid", argIdx)
		args = append(args, groupID)
		argIdx++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (u.first_name ILIKE $%d OR u.last_name ILIKE $%d OR u.email ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+search+"%")
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limitNum, offset)

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var users []gin.H
	for rows.Next() {
		var id, email, fn, ln, rn string
		var active bool
		var created time.Time
		var phone, cc, bd, iin, gid, gname *string
		rows.Scan(&id, &email, &fn, &ln, &rn, &active, &created, &phone, &cc, &bd, &iin, &gid, &gname)
		users = append(users, gin.H{"id": id, "email": email, "first_name": fn, "last_name": ln,
			"role": rn, "is_active": active, "created_at": created,
			"phone": phone, "country_code": cc, "birth_date": bd, "iin": iin,
			"group_id": gid, "group_name": gname})
	}
	if users == nil {
		users = []gin.H{}
	}
	c.JSON(200, gin.H{"users": users})
}

func getUser(c *gin.Context) {
	getProfile(c)
}

func createUser(c *gin.Context) {
	var req struct {
		Email     string  `json:"email" binding:"required"`
		Password  string  `json:"password" binding:"required"`
		FirstName string  `json:"first_name" binding:"required"`
		LastName  string  `json:"last_name" binding:"required"`
		RoleName  *string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	id := uuid.New().String()
	roleName := "student"
	if req.RoleName != nil {
		roleName = *req.RoleName
	}

	var roleID string
	db.QueryRow("SELECT id FROM roles WHERE name = $1", roleName).Scan(&roleID)

	_, err := db.Exec(
		`INSERT INTO users (id, email, password_hash, first_name, last_name, role_id) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, req.Email, req.Password, req.FirstName, req.LastName, roleID)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, gin.H{"id": id, "message": "user created"})
}

func updateUser(c *gin.Context) {
	updateProfile(c)
}

func updateUserRole(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		RoleName string `json:"role_name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	var roleID string
	err := db.QueryRow("SELECT id FROM roles WHERE name = $1", req.RoleName).Scan(&roleID)
	if err != nil {
		c.JSON(404, gin.H{"error": "role not found"})
		return
	}
	db.Exec("UPDATE users SET role_id = $1, updated_at = NOW() WHERE id = $2", roleID, id)
	c.JSON(200, gin.H{"message": "role updated", "role_name": req.RoleName})
}

func deleteUser(c *gin.Context) {
	id := c.Param("id")
	_, err := db.Exec("UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "user deactivated"})
}

func listRoles(c *gin.Context) {
	rows, err := db.Query(
		`SELECT id, name, display_name_en, display_name_ru, display_name_kk, is_system FROM roles ORDER BY name`)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var roles []gin.H
	for rows.Next() {
		var id, name string
		var en, ru, kk *string
		var sys bool
		rows.Scan(&id, &name, &en, &ru, &kk, &sys)
		roles = append(roles, gin.H{"id": id, "name": name, "display_name_en": en, "display_name_ru": ru, "display_name_kk": kk, "is_system": sys})
	}
	c.JSON(200, gin.H{"roles": roles})
}

func createRole(c *gin.Context) {
	var req struct {
		Name      string `json:"name" binding:"required"`
		DisplayEN string `json:"display_name_en"`
		DisplayRU string `json:"display_name_ru"`
		DisplayKK string `json:"display_name_kk"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	_, err := db.Exec(
		`INSERT INTO roles (id, name, display_name_en, display_name_ru, display_name_kk)
		VALUES ($1,$2,$3,$4,$5)`, id, req.Name, req.DisplayEN, req.DisplayRU, req.DisplayKK)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, gin.H{"id": id})
}

func updateRole(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		DisplayEN *string `json:"display_name_en"`
		DisplayRU *string `json:"display_name_ru"`
		DisplayKK *string `json:"display_name_kk"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE roles SET display_name_en=COALESCE($1,display_name_en),
		display_name_ru=COALESCE($2,display_name_ru),
		display_name_kk=COALESCE($3,display_name_kk), updated_at=NOW() WHERE id=$4`,
		req.DisplayEN, req.DisplayRU, req.DisplayKK, id)
	c.JSON(200, gin.H{"message": "role updated"})
}

func deleteRole(c *gin.Context) {
	id := c.Param("id")
	var isSys bool
	db.QueryRow("SELECT is_system FROM roles WHERE id=$1", id).Scan(&isSys)
	if isSys {
		c.JSON(400, gin.H{"error": "cannot delete system role"})
		return
	}
	db.Exec("DELETE FROM roles WHERE id=$1", id)
	c.JSON(200, gin.H{"message": "role deleted"})
}

func getRolePermissions(c *gin.Context) {
	id := c.Param("id")
	rows, err := db.Query(
		`SELECT p.id, p.code, p.name_en, p.name_ru, p.name_kk, p.category
		FROM permissions p JOIN role_permissions rp ON p.id=rp.permission_id WHERE rp.role_id=$1`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var perms []gin.H
	for rows.Next() {
		var pid, code string
		var ne, nr, nk *string
		var cat *string
		rows.Scan(&pid, &code, &ne, &nr, &nk, &cat)
		perms = append(perms, gin.H{"id": pid, "code": code, "name_en": ne, "name_ru": nr, "name_kk": nk, "category": cat})
	}
	c.JSON(200, gin.H{"permissions": perms})
}

func updateRolePermissions(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		PermissionIDs []string `json:"permission_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	db.Exec("DELETE FROM role_permissions WHERE role_id=$1", id)
	for _, pid := range req.PermissionIDs {
		db.Exec("INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2)", id, pid)
	}
	c.JSON(200, gin.H{"message": "permissions updated"})
}

func listAllPermissions(c *gin.Context) {
	rows, err := db.Query(`SELECT id, code, name_en, name_ru, name_kk, category FROM permissions ORDER BY category, code`)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var perms []gin.H
	for rows.Next() {
		var pid, code string
		var ne, nr, nk, cat *string
		rows.Scan(&pid, &code, &ne, &nr, &nk, &cat)
		perms = append(perms, gin.H{"id": pid, "code": code, "name_en": ne, "name_ru": nr, "name_kk": nk, "category": cat})
	}
	c.JSON(200, gin.H{"permissions": perms})
}

func listOrganizations(c *gin.Context) {
	rows, _ := db.Query("SELECT id, name_en, name_ru, name_kk, slug FROM organizations")
	defer rows.Close()
	var orgs []gin.H
	for rows.Next() {
		var id, ne string
		var nr, nk, slug *string
		rows.Scan(&id, &ne, &nr, &nk, &slug)
		orgs = append(orgs, gin.H{"id": id, "name_en": ne, "name_ru": nr, "name_kk": nk, "slug": slug})
	}
	c.JSON(200, gin.H{"organizations": orgs})
}

func createOrganization(c *gin.Context) {
	var req struct {
		NameEN string `json:"name_en" binding:"required"`
		NameRU string `json:"name_ru"`
		NameKK string `json:"name_kk"`
		Slug   string `json:"slug"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	if req.Slug == "" {
		req.Slug = strings.ToLower(strings.ReplaceAll(req.NameEN, " ", "-"))
	}
	db.Exec(`INSERT INTO organizations (id,name_en,name_ru,name_kk,slug) VALUES ($1,$2,$3,$4,$5)`,
		id, req.NameEN, req.NameRU, req.NameKK, req.Slug)
	c.JSON(201, gin.H{"id": id})
}

func listFaculties(c *gin.Context) {
	orgID := c.Query("organization_id")
	query := "SELECT id, organization_id, name_en, name_ru, name_kk, code FROM faculties"
	args := []interface{}{}
	if orgID != "" {
		query += " WHERE organization_id=$1"
		args = append(args, orgID)
	}
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, oid, ne string
		var nr, nk, code *string
		rows.Scan(&id, &oid, &ne, &nr, &nk, &code)
		items = append(items, gin.H{"id": id, "organization_id": oid, "name_en": ne, "name_ru": nr, "name_kk": nk, "code": code})
	}
	c.JSON(200, gin.H{"faculties": items})
}

func createFaculty(c *gin.Context) {
	var req struct {
		OrgID  string `json:"organization_id" binding:"required"`
		NameEN string `json:"name_en" binding:"required"`
		NameRU string `json:"name_ru"`
		NameKK string `json:"name_kk"`
		Code   string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	db.Exec(`INSERT INTO faculties (id,organization_id,name_en,name_ru,name_kk,code) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, req.OrgID, req.NameEN, req.NameRU, req.NameKK, req.Code)
	c.JSON(201, gin.H{"id": id})
}

func listDepartments(c *gin.Context) {
	facID := c.Query("faculty_id")
	query := "SELECT id, faculty_id, name_en, name_ru, name_kk, code FROM departments"
	args := []interface{}{}
	if facID != "" {
		query += " WHERE faculty_id=$1"
		args = append(args, facID)
	}
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, fid, ne string
		var nr, nk, code *string
		rows.Scan(&id, &fid, &ne, &nr, &nk, &code)
		items = append(items, gin.H{"id": id, "faculty_id": fid, "name_en": ne, "name_ru": nr, "name_kk": nk, "code": code})
	}
	c.JSON(200, gin.H{"departments": items})
}

func createDepartment(c *gin.Context) {
	var req struct {
		FacultyID string `json:"faculty_id" binding:"required"`
		NameEN    string `json:"name_en" binding:"required"`
		NameRU    string `json:"name_ru"`
		NameKK    string `json:"name_kk"`
		Code      string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	db.Exec(`INSERT INTO departments (id,faculty_id,name_en,name_ru,name_kk,code) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, req.FacultyID, req.NameEN, req.NameRU, req.NameKK, req.Code)
	c.JSON(201, gin.H{"id": id})
}

func listGroups(c *gin.Context) {
	depID := c.Query("department_id")
	query := "SELECT id, department_id, name, year FROM student_groups"
	args := []interface{}{}
	if depID != "" {
		query += " WHERE department_id=$1"
		args = append(args, depID)
	}
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var items []gin.H
	for rows.Next() {
		var id, name string
		var did *string
		var year *int
		rows.Scan(&id, &did, &name, &year)
		items = append(items, gin.H{"id": id, "department_id": did, "name": name, "year": year})
	}
	c.JSON(200, gin.H{"groups": items})
}

func createGroup(c *gin.Context) {
	var req struct {
		DepartmentID *string `json:"department_id"`
		Name         string  `json:"name" binding:"required"`
		Year         *int    `json:"year"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	db.Exec(`INSERT INTO student_groups (id,department_id,name,year) VALUES ($1,$2,$3,$4)`,
		id, req.DepartmentID, req.Name, req.Year)
	c.JSON(201, gin.H{"id": id})
}

func deleteGroup(c *gin.Context) {
	id := c.Param("id")
	// Remove group_id from all users in this group first
	db.Exec("UPDATE users SET group_id = NULL WHERE group_id = $1", id)
	_, err := db.Exec("DELETE FROM student_groups WHERE id = $1", id)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"message": "group deleted"})
}

func updateUserGroup(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		GroupID *string `json:"group_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.GroupID == nil || *req.GroupID == "" {
		// Clear group
		_, err := db.Exec("UPDATE users SET group_id = NULL, updated_at = NOW() WHERE id = $1", id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	} else {
		// Set group
		_, err := db.Exec("UPDATE users SET group_id = $1, updated_at = NOW() WHERE id = $2", *req.GroupID, id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
	}
	c.JSON(200, gin.H{"message": "user group updated"})
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

func getEnv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
