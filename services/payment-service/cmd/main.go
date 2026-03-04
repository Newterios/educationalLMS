package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
		c.JSON(200, gin.H{"status": "ok", "service": "payment-service"})
	})

	r.POST("/payments", createPayment)
	r.GET("/payments", listPayments)
	r.GET("/payments/:id", getPayment)
	r.PUT("/payments/:id/status", updatePaymentStatus)
	r.GET("/payments/user/:user_id", getUserPayments)
	r.GET("/payments/stats", paymentStats)

	port := getEnv("PORT", "8010")
	log.Printf("Payment service starting on port %s", port)
	r.Run(":" + port)
}

func createPayment(c *gin.Context) {
	var req struct {
		UserID        string  `json:"user_id" binding:"required"`
		CourseID      *string `json:"course_id"`
		Type          string  `json:"type" binding:"required"`
		Amount        float64 `json:"amount" binding:"required"`
		Currency      string  `json:"currency"`
		PaymentMethod string  `json:"payment_method"`
		DescEN        *string `json:"description_en"`
		DescRU        *string `json:"description_ru"`
		DescKK        *string `json:"description_kk"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Currency == "" {
		req.Currency = "KZT"
	}
	id := uuid.New().String()
	db.Exec(
		`INSERT INTO payments (id,user_id,course_id,type,amount,currency,payment_method,description_en,description_ru,description_kk)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, req.UserID, req.CourseID, req.Type, req.Amount, req.Currency, req.PaymentMethod,
		req.DescEN, req.DescRU, req.DescKK)
	c.JSON(201, gin.H{"id": id, "status": "pending"})
}

func listPayments(c *gin.Context) {
	status := c.Query("status")
	query := `SELECT p.id, p.user_id, u.first_name, u.last_name, p.type, p.amount, p.currency,
		p.status, p.payment_method, p.created_at
		FROM payments p JOIN users u ON p.user_id=u.id`
	args := []interface{}{}
	if status != "" {
		query += " WHERE p.status=$1"
		args = append(args, status)
	}
	query += " ORDER BY p.created_at DESC"
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var payments []gin.H
	for rows.Next() {
		var id, uid, fn, ln, tp, st string
		var amount float64
		var currency string
		var method *string
		var created time.Time
		rows.Scan(&id, &uid, &fn, &ln, &tp, &amount, &currency, &st, &method, &created)
		payments = append(payments, gin.H{"id": id, "user_id": uid, "user_name": fn + " " + ln,
			"type": tp, "amount": amount, "currency": currency, "status": st,
			"payment_method": method, "created_at": created})
	}
	if payments == nil {
		payments = []gin.H{}
	}
	c.JSON(200, gin.H{"payments": payments})
}

func getPayment(c *gin.Context) {
	id := c.Param("id")
	var uid, tp, st, currency string
	var amount float64
	var method, cid, de, dr, dk *string
	var paidAt *time.Time
	var created time.Time
	err := db.QueryRow(
		`SELECT user_id, course_id, type, amount, currency, status, payment_method,
		description_en, description_ru, description_kk, paid_at, created_at
		FROM payments WHERE id=$1`, id,
	).Scan(&uid, &cid, &tp, &amount, &currency, &st, &method, &de, &dr, &dk, &paidAt, &created)
	if err != nil {
		c.JSON(404, gin.H{"error": "payment not found"})
		return
	}
	c.JSON(200, gin.H{"id": id, "user_id": uid, "course_id": cid, "type": tp,
		"amount": amount, "currency": currency, "status": st, "payment_method": method,
		"description_en": de, "description_ru": dr, "description_kk": dk,
		"paid_at": paidAt, "created_at": created})
}

func updatePaymentStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status     string  `json:"status" binding:"required"`
		ExternalID *string `json:"external_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Status == "paid" {
		db.Exec("UPDATE payments SET status=$1, external_id=$2, paid_at=NOW(), updated_at=NOW() WHERE id=$3",
			req.Status, req.ExternalID, id)
	} else {
		db.Exec("UPDATE payments SET status=$1, external_id=$2, updated_at=NOW() WHERE id=$3",
			req.Status, req.ExternalID, id)
	}
	c.JSON(200, gin.H{"message": "payment status updated"})
}

func getUserPayments(c *gin.Context) {
	userID := c.Param("user_id")
	rows, _ := db.Query(
		`SELECT id, course_id, type, amount, currency, status, payment_method, created_at
		FROM payments WHERE user_id=$1 ORDER BY created_at DESC`, userID)
	defer rows.Close()
	var payments []gin.H
	for rows.Next() {
		var id, tp, st, currency string
		var amount float64
		var cid, method *string
		var created time.Time
		rows.Scan(&id, &cid, &tp, &amount, &currency, &st, &method, &created)
		payments = append(payments, gin.H{"id": id, "course_id": cid, "type": tp,
			"amount": amount, "currency": currency, "status": st,
			"payment_method": method, "created_at": created})
	}
	if payments == nil {
		payments = []gin.H{}
	}
	c.JSON(200, gin.H{"payments": payments})
}

func paymentStats(c *gin.Context) {
	var totalRevenue float64
	var totalPayments, pendingPayments, paidPayments int
	db.QueryRow("SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='paid'").Scan(&totalRevenue)
	db.QueryRow("SELECT COUNT(*) FROM payments").Scan(&totalPayments)
	db.QueryRow("SELECT COUNT(*) FROM payments WHERE status='pending'").Scan(&pendingPayments)
	db.QueryRow("SELECT COUNT(*) FROM payments WHERE status='paid'").Scan(&paidPayments)
	c.JSON(200, gin.H{"total_revenue": totalRevenue, "total_payments": totalPayments,
		"pending": pendingPayments, "paid": paidPayments})
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
