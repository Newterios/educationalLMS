package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

var (
	db  *sql.DB
	rdb *redis.Client
)

func main() {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("POSTGRES_HOST", "localhost"), getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_USER", "edulms"), getEnv("POSTGRES_PASSWORD", "edulms_secret"),
		getEnv("POSTGRES_DB", "edulms"))

	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rdb = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", getEnv("REDIS_HOST", "localhost"), getEnv("REDIS_PORT", "6379")),
		Password: getEnv("REDIS_PASSWORD", ""),
	})

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), corsMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "attendance-service"})
	})

	r.POST("/mark", markAttendance)
	r.GET("/course/:course_id", getCourseAttendance)
	r.GET("/user/:user_id", getUserAttendance)

	r.POST("/qr/generate", generateQR)
	r.POST("/qr/verify", verifyQR)

	r.GET("/rules/:course_id", getAttendanceRules)
	r.POST("/rules", createAttendanceRules)
	r.PUT("/rules/:id", updateAttendanceRules)

	r.GET("/stats/:course_id", getAttendanceStats)

	port := getEnv("PORT", "8005")
	log.Printf("Attendance service starting on port %s", port)
	r.Run(":" + port)
}

func markAttendance(c *gin.Context) {
	var req struct {
		CourseID string `json:"course_id" binding:"required"`
		UserID   string `json:"user_id" binding:"required"`
		Status   string `json:"status" binding:"required"`
		Date     string `json:"date"`
		MarkedBy string `json:"marked_by"`
		Note     string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}
	id := uuid.New().String()
	_, err := db.Exec(
		`INSERT INTO attendance_records (id,course_id,user_id,date,status,marked_by,note)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		id, req.CourseID, req.UserID, req.Date, req.Status, req.MarkedBy, req.Note)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, gin.H{"id": id})
}

func getCourseAttendance(c *gin.Context) {
	courseID := c.Param("course_id")
	date := c.Query("date")
	query := `SELECT a.id, a.user_id, u.first_name, u.last_name, a.date, a.status, a.note
		FROM attendance_records a JOIN users u ON a.user_id=u.id WHERE a.course_id=$1`
	args := []interface{}{courseID}
	if date != "" {
		query += " AND a.date=$2"
		args = append(args, date)
	}
	query += " ORDER BY a.date DESC, u.last_name"
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var records []gin.H
	for rows.Next() {
		var id, uid, fn, ln, status string
		var d time.Time
		var note *string
		rows.Scan(&id, &uid, &fn, &ln, &d, &status, &note)
		records = append(records, gin.H{"id": id, "user_id": uid, "first_name": fn, "last_name": ln,
			"date": d.Format("2006-01-02"), "status": status, "note": note})
	}
	if records == nil {
		records = []gin.H{}
	}
	c.JSON(200, gin.H{"records": records})
}

func getUserAttendance(c *gin.Context) {
	userID := c.Param("user_id")
	courseID := c.Query("course_id")
	query := `SELECT id, course_id, date, status, note FROM attendance_records WHERE user_id=$1`
	args := []interface{}{userID}
	if courseID != "" {
		query += " AND course_id=$2"
		args = append(args, courseID)
	}
	query += " ORDER BY date DESC"
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var records []gin.H
	for rows.Next() {
		var id, cid, status string
		var d time.Time
		var note *string
		rows.Scan(&id, &cid, &d, &status, &note)
		records = append(records, gin.H{"id": id, "course_id": cid, "date": d.Format("2006-01-02"), "status": status, "note": note})
	}
	if records == nil {
		records = []gin.H{}
	}
	c.JSON(200, gin.H{"records": records})
}

func generateQR(c *gin.Context) {
	var req struct {
		CourseID  string   `json:"course_id" binding:"required"`
		CreatedBy string   `json:"created_by" binding:"required"`
		TTLMin    int      `json:"ttl_minutes"`
		Latitude  *float64 `json:"latitude"`
		Longitude *float64 `json:"longitude"`
		Radius    *int     `json:"radius_meters"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.TTLMin == 0 {
		req.TTLMin = 5
	}

	codeBytes := make([]byte, 16)
	rand.Read(codeBytes)
	code := hex.EncodeToString(codeBytes)

	id := uuid.New().String()
	expiresAt := time.Now().Add(time.Duration(req.TTLMin) * time.Minute)

	db.Exec(`INSERT INTO qr_sessions (id,course_id,code,created_by,expires_at,latitude,longitude,radius_meters)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		id, req.CourseID, code, req.CreatedBy, expiresAt, req.Latitude, req.Longitude, req.Radius)

	rdb.Set(context.Background(), fmt.Sprintf("qr:%s", code), req.CourseID, time.Duration(req.TTLMin)*time.Minute)

	c.JSON(201, gin.H{"qr_session_id": id, "code": code, "expires_at": expiresAt})
}

func verifyQR(c *gin.Context) {
	var req struct {
		Code   string `json:"code" binding:"required"`
		UserID string `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	courseID, err := rdb.Get(context.Background(), fmt.Sprintf("qr:%s", req.Code)).Result()
	if err != nil {
		c.JSON(400, gin.H{"error": "QR code expired or invalid"})
		return
	}

	id := uuid.New().String()
	db.Exec(`INSERT INTO attendance_records (id,course_id,user_id,date,status) VALUES ($1,$2,$3,$4,'present')`,
		id, courseID, req.UserID, time.Now().Format("2006-01-02"))
	c.JSON(200, gin.H{"message": "attendance marked", "course_id": courseID})
}

func getAttendanceRules(c *gin.Context) {
	courseID := c.Param("course_id")
	var id string
	var maxAbs int
	var penalty string
	var lateCounts float64
	err := db.QueryRow("SELECT id, max_absences, absence_penalty, late_counts_as FROM attendance_rules WHERE course_id=$1", courseID).
		Scan(&id, &maxAbs, &penalty, &lateCounts)
	if err != nil {
		c.JSON(404, gin.H{"error": "no rules set"})
		return
	}
	c.JSON(200, gin.H{"id": id, "max_absences": maxAbs, "absence_penalty": penalty, "late_counts_as": lateCounts})
}

func createAttendanceRules(c *gin.Context) {
	var req struct {
		CourseID       string  `json:"course_id" binding:"required"`
		MaxAbsences    int     `json:"max_absences"`
		AbsencePenalty string  `json:"absence_penalty"`
		LateCountsAs   float64 `json:"late_counts_as"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	if req.MaxAbsences == 0 {
		req.MaxAbsences = 3
	}
	if req.AbsencePenalty == "" {
		req.AbsencePenalty = "warning"
	}
	if req.LateCountsAs == 0 {
		req.LateCountsAs = 0.5
	}
	db.Exec(`INSERT INTO attendance_rules (id,course_id,max_absences,absence_penalty,late_counts_as)
		VALUES ($1,$2,$3,$4,$5)`, id, req.CourseID, req.MaxAbsences, req.AbsencePenalty, req.LateCountsAs)
	c.JSON(201, gin.H{"id": id})
}

func updateAttendanceRules(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		MaxAbsences    *int     `json:"max_absences"`
		AbsencePenalty *string  `json:"absence_penalty"`
		LateCountsAs   *float64 `json:"late_counts_as"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE attendance_rules SET max_absences=COALESCE($1,max_absences),
		absence_penalty=COALESCE($2,absence_penalty), late_counts_as=COALESCE($3,late_counts_as),
		updated_at=NOW() WHERE id=$4`,
		req.MaxAbsences, req.AbsencePenalty, req.LateCountsAs, id)
	c.JSON(200, gin.H{"message": "rules updated"})
}

func getAttendanceStats(c *gin.Context) {
	courseID := c.Param("course_id")
	userID := c.Query("user_id")

	if userID != "" {
		var total, present, late, absent, excused int
		db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1 AND user_id=$2", courseID, userID).Scan(&total)
		db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1 AND user_id=$2 AND status='present'", courseID, userID).Scan(&present)
		db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1 AND user_id=$2 AND status='late'", courseID, userID).Scan(&late)
		db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1 AND user_id=$2 AND status='absent'", courseID, userID).Scan(&absent)
		db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1 AND user_id=$2 AND status='excused'", courseID, userID).Scan(&excused)

		rate := 0.0
		if total > 0 {
			rate = float64(present+late) / float64(total) * 100
		}
		c.JSON(200, gin.H{"total": total, "present": present, "late": late, "absent": absent, "excused": excused, "attendance_rate": rate})
		return
	}

	var totalStudents int
	db.QueryRow("SELECT COUNT(DISTINCT user_id) FROM attendance_records WHERE course_id=$1", courseID).Scan(&totalStudents)
	var totalRecords int
	db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1", courseID).Scan(&totalRecords)
	var presentCount int
	db.QueryRow("SELECT COUNT(*) FROM attendance_records WHERE course_id=$1 AND status='present'", courseID).Scan(&presentCount)
	rate := 0.0
	if totalRecords > 0 {
		rate = float64(presentCount) / float64(totalRecords) * 100
	}
	c.JSON(200, gin.H{"total_students": totalStudents, "total_records": totalRecords, "present_count": presentCount, "attendance_rate": rate})
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
