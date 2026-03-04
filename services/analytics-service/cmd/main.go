package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

var db *sql.DB

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

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), corsMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "analytics-service"})
	})

	r.GET("/dashboard/overview", dashboardOverview)
	r.GET("/dashboard/gpa-stats", gpaStats)
	r.GET("/dashboard/attendance-stats", attendanceStats)
	r.GET("/dashboard/course-stats", courseStats)
	r.GET("/dashboard/user-stats", userStats)

	port := getEnv("PORT", "8008")
	log.Printf("Analytics service starting on port %s", port)
	r.Run(":" + port)
}

func dashboardOverview(c *gin.Context) {
	var totalUsers, totalCourses, totalEnrollments, activeStudents int
	db.QueryRow("SELECT COUNT(*) FROM users WHERE is_active=true").Scan(&totalUsers)
	db.QueryRow("SELECT COUNT(*) FROM courses").Scan(&totalCourses)
	db.QueryRow("SELECT COUNT(*) FROM enrollments").Scan(&totalEnrollments)
	db.QueryRow("SELECT COUNT(DISTINCT user_id) FROM enrollments").Scan(&activeStudents)

	var publishedCourses int
	db.QueryRow("SELECT COUNT(*) FROM courses WHERE is_published=true").Scan(&publishedCourses)

	var totalQuizzes, totalAttempts int
	db.QueryRow("SELECT COUNT(*) FROM quizzes").Scan(&totalQuizzes)
	db.QueryRow("SELECT COUNT(*) FROM quiz_attempts").Scan(&totalAttempts)

	c.JSON(200, gin.H{
		"total_users":        totalUsers,
		"total_courses":      totalCourses,
		"published_courses":  publishedCourses,
		"total_enrollments":  totalEnrollments,
		"active_students":    activeStudents,
		"total_quizzes":      totalQuizzes,
		"total_quiz_attempts": totalAttempts,
	})
}

func gpaStats(c *gin.Context) {
	courseID := c.Query("course_id")

	if courseID != "" {
		rows, _ := db.Query(
			`SELECT g.component, AVG(g.score) as avg_score, MAX(g.score) as max_score,
			MIN(g.score) as min_score, COUNT(*) as count
			FROM grades g WHERE g.course_id=$1 GROUP BY g.component`, courseID)
		defer rows.Close()
		var stats []gin.H
		for rows.Next() {
			var comp string
			var avg, max, min float64
			var count int
			rows.Scan(&comp, &avg, &max, &min, &count)
			stats = append(stats, gin.H{"component": comp, "avg_score": avg, "max_score": max, "min_score": min, "count": count})
		}
		c.JSON(200, gin.H{"course_id": courseID, "grade_stats": stats})
		return
	}

	rows, _ := db.Query(
		`SELECT c.id, c.title_en, AVG(g.score) as avg_score, COUNT(DISTINCT g.user_id) as students
		FROM grades g JOIN courses c ON g.course_id=c.id
		GROUP BY c.id, c.title_en ORDER BY avg_score DESC`)
	defer rows.Close()
	var stats []gin.H
	for rows.Next() {
		var id, title string
		var avg float64
		var count int
		rows.Scan(&id, &title, &avg, &count)
		stats = append(stats, gin.H{"course_id": id, "course_title": title, "avg_score": avg, "student_count": count})
	}
	if stats == nil {
		stats = []gin.H{}
	}
	c.JSON(200, gin.H{"gpa_stats": stats})
}

func attendanceStats(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT c.id, c.title_en,
		COUNT(*) as total,
		COUNT(*) FILTER (WHERE a.status='present') as present,
		COUNT(*) FILTER (WHERE a.status='absent') as absent,
		COUNT(*) FILTER (WHERE a.status='late') as late,
		COUNT(*) FILTER (WHERE a.status='excused') as excused
		FROM attendance_records a JOIN courses c ON a.course_id=c.id
		GROUP BY c.id, c.title_en`)
	defer rows.Close()
	var stats []gin.H
	for rows.Next() {
		var id, title string
		var total, present, absent, late, excused int
		rows.Scan(&id, &title, &total, &present, &absent, &late, &excused)
		rate := 0.0
		if total > 0 {
			rate = float64(present) / float64(total) * 100
		}
		stats = append(stats, gin.H{"course_id": id, "course_title": title, "total": total,
			"present": present, "absent": absent, "late": late, "excused": excused, "rate": rate})
	}
	if stats == nil {
		stats = []gin.H{}
	}
	c.JSON(200, gin.H{"attendance_stats": stats})
}

func courseStats(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT c.id, c.title_en, c.is_published,
		(SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) as enrollment_count,
		(SELECT COUNT(*) FROM course_sections cs WHERE cs.course_id=c.id) as section_count,
		(SELECT COUNT(*) FROM quizzes q WHERE q.course_id=c.id) as quiz_count
		FROM courses c ORDER BY enrollment_count DESC`)
	defer rows.Close()
	var stats []gin.H
	for rows.Next() {
		var id, title string
		var pub bool
		var enrollments, sections, quizzes int
		rows.Scan(&id, &title, &pub, &enrollments, &sections, &quizzes)
		stats = append(stats, gin.H{"course_id": id, "title": title, "is_published": pub,
			"enrollments": enrollments, "sections": sections, "quizzes": quizzes})
	}
	if stats == nil {
		stats = []gin.H{}
	}
	c.JSON(200, gin.H{"course_stats": stats})
}

func userStats(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT r.name, r.display_name_en, COUNT(u.id) as count
		FROM roles r LEFT JOIN users u ON u.role_id=r.id
		GROUP BY r.name, r.display_name_en ORDER BY count DESC`)
	defer rows.Close()
	var stats []gin.H
	for rows.Next() {
		var name string
		var display *string
		var count int
		rows.Scan(&name, &display, &count)
		stats = append(stats, gin.H{"role": name, "display_name": display, "count": count})
	}
	if stats == nil {
		stats = []gin.H{}
	}
	c.JSON(200, gin.H{"user_stats": stats})
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
