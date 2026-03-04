package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

var db *sql.DB
var jwtSecret string

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	RoleID string `json:"role_id"`
	jwt.RegisteredClaims
}

func main() {
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getEnv("POSTGRES_HOST", "localhost"), getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_USER", "edulms"), getEnv("POSTGRES_PASSWORD", "edulms_secret"),
		getEnv("POSTGRES_DB", "edulms"))
	
	jwtSecret = getEnv("JWT_SECRET", "default-secret")

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
		c.JSON(200, gin.H{"status": "ok", "service": "assessment-service"})
	})

	r.GET("/quizzes", listQuizzes)
	r.GET("/quizzes/:id", getQuiz)
	r.POST("/quizzes", createQuiz)
	r.PUT("/quizzes/:id", updateQuiz)
	r.DELETE("/quizzes/:id", deleteQuiz)

	r.GET("/quizzes/:id/questions", listQuestions)
	r.POST("/quizzes/:id/questions", createQuestion)
	r.PUT("/questions/:id", updateQuestion)
	r.DELETE("/questions/:id", deleteQuestion)

	r.POST("/quizzes/:id/submit", submitQuiz)
	r.GET("/quizzes/:id/attempts", listAttempts)

	r.GET("/grades/course/:course_id", getGradebook)
	r.GET("/grades/progress/:course_id", getStudentProgress)
	r.GET("/grades/advanced-progress/:course_id", getAdvancedProgress)
	r.POST("/grades", createGrade)
	r.PUT("/grades/:id", updateGrade)

	r.GET("/gpa-formula/course/:course_id", getGPAFormula)
	r.POST("/gpa-formula", createGPAFormula)
	r.PUT("/gpa-formula/:id", updateGPAFormula)

	r.GET("/assignments", authMiddleware(), listAssignments)
	r.GET("/assignments/:id", authMiddleware(), getAssignment)
	r.POST("/assignments", authMiddleware(), permissionMiddleware("assignment.create"), createAssignment)
	r.PUT("/assignments/:id", authMiddleware(), permissionMiddleware("assignment.edit"), updateAssignment)
	r.DELETE("/assignments/:id", authMiddleware(), permissionMiddleware("assignment.delete"), deleteAssignment)
	r.POST("/assignments/:id/submit", authMiddleware(), submitAssignment)
	r.DELETE("/assignments/:id/submissions", authMiddleware(), deleteStudentSubmission)
	r.GET("/assignments/:id/submissions", authMiddleware(), permissionMiddleware("grade.view"), listSubmissions)
	r.PUT("/submissions/:id/grade", authMiddleware(), permissionMiddleware("grade.edit"), gradeSubmission)

	port := getEnv("PORT", "8004")
	log.Printf("Assessment service starting on port %s", port)
	r.Run(":" + port)
}

func deleteStudentSubmission(c *gin.Context) {
	assignmentID := c.Param("id")
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(400, gin.H{"error": "user_id is required"})
		return
	}
	
	var dueDate *time.Time
	var allowLate bool
	db.QueryRow("SELECT due_date, allow_late_submission FROM assignments WHERE id=$1", assignmentID).Scan(&dueDate, &allowLate)
	
	if dueDate != nil && time.Now().After(*dueDate) && !allowLate {
		c.JSON(403, gin.H{"error": "deadline passed, cannot delete submission"})
		return
	}
	
	db.Exec("DELETE FROM assignment_submissions WHERE assignment_id=$1 AND user_id=$2", assignmentID, userID)
	c.JSON(200, gin.H{"message": "submission deleted"})
}

func listQuizzes(c *gin.Context) {
	courseID := c.Query("course_id")
	query := `SELECT id, course_id, title_en, title_ru, title_kk, type, time_limit_minutes,
		max_attempts, is_published, start_date, end_date, created_at FROM quizzes`
	args := []interface{}{}
	if courseID != "" {
		query += " WHERE course_id=$1"
		args = append(args, courseID)
	}
	query += " ORDER BY created_at DESC"
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var quizzes []gin.H
	for rows.Next() {
		var id, cid, te, tp string
		var tr, tk *string
		var tlm, ma *int
		var pub bool
		var sd, ed *time.Time
		var ca time.Time
		rows.Scan(&id, &cid, &te, &tr, &tk, &tp, &tlm, &ma, &pub, &sd, &ed, &ca)
		quizzes = append(quizzes, gin.H{"id": id, "course_id": cid, "title_en": te, "title_ru": tr, "title_kk": tk,
			"type": tp, "time_limit_minutes": tlm, "max_attempts": ma, "is_published": pub,
			"start_date": sd, "end_date": ed, "created_at": ca})
	}
	if quizzes == nil {
		quizzes = []gin.H{}
	}
	c.JSON(200, gin.H{"quizzes": quizzes})
}

func getQuiz(c *gin.Context) {
	id := c.Param("id")
	var quiz gin.H
	var qid, cid, te, tp string
	var tr, tk, de, dr, dk *string
	var tlm, ma *int
	var sf, sa, pub bool
	var sr *string
	var sd, ed *time.Time
	var ca time.Time
	err := db.QueryRow(
		`SELECT id, course_id, title_en, title_ru, title_kk, description_en, description_ru, description_kk,
		type, time_limit_minutes, max_attempts, shuffle_questions, shuffle_answers,
		show_results, is_published, start_date, end_date, created_at FROM quizzes WHERE id=$1`, id,
	).Scan(&qid, &cid, &te, &tr, &tk, &de, &dr, &dk, &tp, &tlm, &ma, &sf, &sa, &sr, &pub, &sd, &ed, &ca)
	if err != nil {
		c.JSON(404, gin.H{"error": "quiz not found"})
		return
	}
	quiz = gin.H{"id": qid, "course_id": cid, "title_en": te, "title_ru": tr, "title_kk": tk,
		"description_en": de, "description_ru": dr, "description_kk": dk, "type": tp,
		"time_limit_minutes": tlm, "max_attempts": ma, "shuffle_questions": sf,
		"shuffle_answers": sa, "show_results": sr, "is_published": pub,
		"start_date": sd, "end_date": ed, "created_at": ca}
	c.JSON(200, quiz)
}

func createQuiz(c *gin.Context) {
	var req struct {
		CourseID         string  `json:"course_id" binding:"required"`
		SectionID        *string `json:"section_id"`
		TitleEN          string  `json:"title_en" binding:"required"`
		TitleRU          *string `json:"title_ru"`
		TitleKK          *string `json:"title_kk"`
		Type             string  `json:"type"`
		TimeLimitMinutes *int    `json:"time_limit_minutes"`
		MaxAttempts      *int    `json:"max_attempts"`
		ShuffleQuestions bool    `json:"shuffle_questions"`
		ShuffleAnswers   bool    `json:"shuffle_answers"`
		CreatedBy        *string `json:"created_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Type == "" {
		req.Type = "quiz"
	}
	id := uuid.New().String()
	db.Exec(
		`INSERT INTO quizzes (id,course_id,section_id,title_en,title_ru,title_kk,type,
		time_limit_minutes,max_attempts,shuffle_questions,shuffle_answers,created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		id, req.CourseID, req.SectionID, req.TitleEN, req.TitleRU, req.TitleKK, req.Type,
		req.TimeLimitMinutes, req.MaxAttempts, req.ShuffleQuestions, req.ShuffleAnswers, req.CreatedBy)
	c.JSON(201, gin.H{"id": id})
}

func updateQuiz(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TitleEN     *string `json:"title_en"`
		TitleRU     *string `json:"title_ru"`
		TitleKK     *string `json:"title_kk"`
		IsPublished *bool   `json:"is_published"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE quizzes SET title_en=COALESCE($1,title_en), title_ru=COALESCE($2,title_ru),
		title_kk=COALESCE($3,title_kk), is_published=COALESCE($4,is_published), updated_at=NOW() WHERE id=$5`,
		req.TitleEN, req.TitleRU, req.TitleKK, req.IsPublished, id)
	c.JSON(200, gin.H{"message": "quiz updated"})
}

func deleteQuiz(c *gin.Context) {
	db.Exec("DELETE FROM quizzes WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "quiz deleted"})
}

func listQuestions(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT id, type, text_en, text_ru, text_kk, options, correct_answer, points, position
		FROM questions WHERE quiz_id=$1 ORDER BY position`, c.Param("id"))
	defer rows.Close()
	var questions []gin.H
	for rows.Next() {
		var id, tp, te string
		var tr, tk *string
		var opts, ca []byte
		var pts float64
		var pos int
		rows.Scan(&id, &tp, &te, &tr, &tk, &opts, &ca, &pts, &pos)
		var optsJ, caJ interface{}
		json.Unmarshal(opts, &optsJ)
		json.Unmarshal(ca, &caJ)
		questions = append(questions, gin.H{"id": id, "type": tp, "text_en": te, "text_ru": tr, "text_kk": tk,
			"options": optsJ, "correct_answer": caJ, "points": pts, "position": pos})
	}
	if questions == nil {
		questions = []gin.H{}
	}
	c.JSON(200, gin.H{"questions": questions})
}

func createQuestion(c *gin.Context) {
	quizID := c.Param("id")
	var req struct {
		Type          string      `json:"type" binding:"required"`
		TextEN        string      `json:"text_en" binding:"required"`
		TextRU        *string     `json:"text_ru"`
		TextKK        *string     `json:"text_kk"`
		Options       interface{} `json:"options"`
		CorrectAnswer interface{} `json:"correct_answer"`
		Points        *float64    `json:"points"`
		Position      *int        `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	optsJSON, _ := json.Marshal(req.Options)
	caJSON, _ := json.Marshal(req.CorrectAnswer)
	pts := 1.0
	if req.Points != nil {
		pts = *req.Points
	}
	db.Exec(
		`INSERT INTO questions (id,quiz_id,type,text_en,text_ru,text_kk,options,correct_answer,points,position)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, quizID, req.Type, req.TextEN, req.TextRU, req.TextKK, optsJSON, caJSON, pts, req.Position)
	c.JSON(201, gin.H{"id": id})
}

func updateQuestion(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TextEN  *string     `json:"text_en"`
		TextRU  *string     `json:"text_ru"`
		TextKK  *string     `json:"text_kk"`
		Options interface{} `json:"options"`
	}
	c.ShouldBindJSON(&req)
	if req.Options != nil {
		optsJSON, _ := json.Marshal(req.Options)
		db.Exec("UPDATE questions SET options=$1, updated_at=NOW() WHERE id=$2", optsJSON, id)
	}
	db.Exec(`UPDATE questions SET text_en=COALESCE($1,text_en), text_ru=COALESCE($2,text_ru),
		text_kk=COALESCE($3,text_kk), updated_at=NOW() WHERE id=$4`,
		req.TextEN, req.TextRU, req.TextKK, id)
	c.JSON(200, gin.H{"message": "question updated"})
}

func deleteQuestion(c *gin.Context) {
	db.Exec("DELETE FROM questions WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "question deleted"})
}

func submitQuiz(c *gin.Context) {
	quizID := c.Param("id")
	var req struct {
		UserID  string      `json:"user_id" binding:"required"`
		Answers interface{} `json:"answers" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	answersJSON, _ := json.Marshal(req.Answers)
	db.Exec(
		`INSERT INTO quiz_attempts (id,quiz_id,user_id,answers,status,submitted_at) VALUES ($1,$2,$3,$4,'submitted',NOW())`,
		id, quizID, req.UserID, answersJSON)
	c.JSON(201, gin.H{"attempt_id": id, "message": "quiz submitted"})
}

func listAttempts(c *gin.Context) {
	quizID := c.Param("id")
	userID := c.Query("user_id")
	query := `SELECT id, user_id, score, max_score, status, started_at, submitted_at FROM quiz_attempts WHERE quiz_id=$1`
	args := []interface{}{quizID}
	if userID != "" {
		query += " AND user_id=$2"
		args = append(args, userID)
	}
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var attempts []gin.H
	for rows.Next() {
		var id, uid, status string
		var score, ms *float64
		var sa time.Time
		var sub *time.Time
		rows.Scan(&id, &uid, &score, &ms, &status, &sa, &sub)
		attempts = append(attempts, gin.H{"id": id, "user_id": uid, "score": score, "max_score": ms,
			"status": status, "started_at": sa, "submitted_at": sub})
	}
	if attempts == nil {
		attempts = []gin.H{}
	}
	c.JSON(200, gin.H{"attempts": attempts})
}

func getGradebook(c *gin.Context) {
	courseID := c.Param("course_id")
	rows, _ := db.Query(
		`SELECT g.id, g.user_id, u.first_name, u.last_name, g.component, g.score, g.max_score, g.weight, g.comment, g.graded_at
		FROM grades g JOIN users u ON g.user_id=u.id WHERE g.course_id=$1 ORDER BY u.last_name, g.component`, courseID)
	defer rows.Close()
	var grades []gin.H
	for rows.Next() {
		var id, uid, fn, ln, comp string
		var score, ms, weight *float64
		var comment *string
		var ga time.Time
		rows.Scan(&id, &uid, &fn, &ln, &comp, &score, &ms, &weight, &comment, &ga)
		// Calculate earned points: (score / max_score) * weight
		var earned float64
		if score != nil && ms != nil && *ms > 0 && weight != nil {
			earned = (*score / *ms) * *weight
		}
		grades = append(grades, gin.H{"id": id, "user_id": uid, "first_name": fn, "last_name": ln,
			"component": comp, "score": score, "max_score": ms, "weight": weight,
			"earned": math.Round(earned*100) / 100, "comment": comment, "graded_at": ga})
	}
	if grades == nil {
		grades = []gin.H{}
	}
	c.JSON(200, gin.H{"grades": grades})
}

func getAdvancedProgress(c *gin.Context) {
	courseID := c.Param("course_id")
	
	// 1. Get Formula and Thresholds
	var formula struct {
		Components []struct {
			ID     string  `json:"id"`
			Name   string  `json:"name"`
			Weight float64 `json:"weight"`
			Type   string  `json:"type"` // midterm, endterm, final, assignment, etc.
		} `json:"components"`
		Rules               interface{} `json:"rules"`
		AttendanceThreshold float64     `json:"attendance_threshold"`
		RegtermThreshold    float64     `json:"regterm_threshold"`
		FinalThreshold      float64     `json:"final_threshold"`
	}
	var compBytes, ruleBytes []byte
	var att, reg, fin sql.NullFloat64

	err := db.QueryRow(`SELECT components, rules, attendance_threshold, regterm_threshold, final_threshold 
		FROM gpa_formulas WHERE course_id=$1`, courseID).
		Scan(&compBytes, &ruleBytes, &att, &reg, &fin)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(200, gin.H{"error": "formula not found", "students": []interface{}{}})
		} else {
			log.Printf("Error fetching formula for progress: %v", err)
			c.JSON(500, gin.H{"error": "database error"})
		}
		return
	}
	json.Unmarshal(compBytes, &formula.Components)
	json.Unmarshal(ruleBytes, &formula.Rules)
	
	// Set defaults if null
	formula.AttendanceThreshold = 70.0; if att.Valid { formula.AttendanceThreshold = att.Float64 }
	formula.RegtermThreshold = 50.0; if reg.Valid { formula.RegtermThreshold = reg.Float64 }
	formula.FinalThreshold = 50.0; if fin.Valid { formula.FinalThreshold = fin.Float64 }

	// 2. Get Students (Enrolled)
	studentRows, _ := db.Query(`SELECT u.id, u.first_name, u.last_name FROM enrollments e JOIN users u ON e.user_id=u.id WHERE e.course_id=$1 AND e.role='student'`, courseID)
	defer studentRows.Close()
	type StudentInfo struct {
		ID        string `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
	}
	var students []StudentInfo
	for studentRows.Next() {
		var s StudentInfo
		studentRows.Scan(&s.ID, &s.FirstName, &s.LastName)
		students = append(students, s)
	}

	// 3. Get Assignments mapped to components
	rows, _ := db.Query(`SELECT id, grading_component_id, max_score FROM assignments WHERE course_id=$1 AND grading_component_id IS NOT NULL`, courseID)
	defer rows.Close()
	assignments := make(map[string]struct{ CompID string; MaxScore float64 })
	for rows.Next() {
		var id, compID string
		var maxScore float64
		rows.Scan(&id, &compID, &maxScore)
		assignments[id] = struct{ CompID string; MaxScore float64 }{compID, maxScore}
	}

	// 4. Get Student Submissions
	subRows, _ := db.Query(`
		SELECT s.user_id, s.assignment_id, s.score 
		FROM assignment_submissions s 
		JOIN assignments a ON s.assignment_id = a.id
		WHERE a.course_id=$1 AND s.score IS NOT NULL
	`, courseID)
	defer subRows.Close()
	
	studentCompScores := make(map[string]map[string][]float64) // userID -> compID -> scores
	for subRows.Next() {
		var uid, aid string
		var score float64
		subRows.Scan(&uid, &aid, &score)
		if a, ok := assignments[aid]; ok {
			if _, ok := studentCompScores[uid]; !ok {
				studentCompScores[uid] = make(map[string][]float64)
			}
			// Store as percentage of max for that assignment
			studentCompScores[uid][a.CompID] = append(studentCompScores[uid][a.CompID], (score/a.MaxScore)*100)
		}
	}

	// 5. Get Manual Grades
	gradeRows, _ := db.Query(`SELECT user_id, component, score, max_score FROM grades WHERE course_id=$1`, courseID)
	defer gradeRows.Close()
	for gradeRows.Next() {
		var uid, comp string
		var score, maxScore float64
		gradeRows.Scan(&uid, &comp, &score, &maxScore)
		if _, ok := studentCompScores[uid]; !ok {
			studentCompScores[uid] = make(map[string][]float64)
		}
		studentCompScores[uid][comp] = append(studentCompScores[uid][comp], (score/maxScore)*100)
	}

	// 6. Get Attendance
	attRows, _ := db.Query(`
		SELECT user_id, 
		COUNT(*) as total, 
		SUM(CASE WHEN status='present' THEN 1 WHEN status='late' THEN 0.5 ELSE 0 END) as attended 
		FROM attendance_records WHERE course_id=$1 GROUP BY user_id
	`, courseID)
	defer attRows.Close()
	attendance := make(map[string]float64)
	for attRows.Next() {
		var uid string
		var total, attended float64
		attRows.Scan(&uid, &total, &attended)
		if total > 0 {
			attendance[uid] = (attended / total) * 100
		}
	}

	// 7. Calculate Results for each student
	type StudentResult struct {
		ID                string             `json:"id"`
		FirstName         string             `json:"first_name"`
		LastName          string             `json:"last_name"`
		Attendance        float64            `json:"attendance"`
		CurrentScore      float64            `json:"current_score"`
		MaxPossibleScore  float64            `json:"max_possible_score"`
		ComponentProgress map[string]float64 `json:"component_progress"` // compID -> earned from this comp (weighted)
		IsSummerTrimester bool               `json:"is_summer_trimester"`
		SummerReason      string             `json:"summer_reason"`
	}
	
	results := []StudentResult{}
	for _, s := range students {
		res := StudentResult{
			ID:                s.ID,
			FirstName:         s.FirstName,
			LastName:          s.LastName,
			Attendance:        attendance[s.ID],
			ComponentProgress: make(map[string]float64),
		}
		
		totalEarned := 0.0
		totalWeightUsed := 0.0
		midtermScore := -1.0
		endtermScore := -1.0
		finalScore := -1.0
		
		for _, comp := range formula.Components {
			scores := studentCompScores[s.ID][comp.ID]
			if len(scores) > 0 {
				// Average of scores in this component
				avg := 0.0
				for _, sc := range scores { avg += sc }
				avg /= float64(len(scores))
				
				weighted := (avg / 100.0) * comp.Weight
				res.ComponentProgress[comp.ID] = weighted
				totalEarned += weighted
				totalWeightUsed += comp.Weight
				
				if comp.Type == "midterm" { midtermScore = avg }
				if comp.Type == "endterm" { endtermScore = avg }
				if comp.Type == "final" { finalScore = avg }
			}
		}
		
		res.CurrentScore = totalEarned
		res.MaxPossibleScore = totalEarned + (100.0 - totalWeightUsed)
		
		// Detailed threshold checks
		res.IsSummerTrimester = false
		res.SummerReason = ""

		// Rule 1: Attendance check (typically after endterm or near the end)
		// We trigger this if endterm has been graded or if current weight is significant
		if res.Attendance < formula.AttendanceThreshold && totalWeightUsed > 30 {
			res.IsSummerTrimester = true
			res.SummerReason = fmt.Sprintf("Attendance %.1f%% is below required %.1f%%", res.Attendance, formula.AttendanceThreshold)
		}

		// Rule 2: Regterm (Midterm + Endterm) / 2
		if !res.IsSummerTrimester && midtermScore >= 0 && endtermScore >= 0 {
			regterm := (midtermScore + endtermScore) / 2.0
			if regterm < formula.RegtermThreshold {
				res.IsSummerTrimester = true
				res.SummerReason = fmt.Sprintf("Regterm score %.1f is below required %.1f", regterm, formula.RegtermThreshold)
			}
		}

		// Rule 3: Final Exam minimum
		if !res.IsSummerTrimester && finalScore >= 0 {
			if finalScore < formula.FinalThreshold {
				res.IsSummerTrimester = true
				res.SummerReason = fmt.Sprintf("Final exam score %.1f is below required %.1f", finalScore, formula.FinalThreshold)
			}
		}

		// Rule 4: Total score fail (if all components graded and total < 50)
		if !res.IsSummerTrimester && totalWeightUsed >= 95 && totalEarned < 50 {
			res.IsSummerTrimester = true
			res.SummerReason = "Total score below 50%"
		}
		
		results = append(results, res)
	}

	c.JSON(200, gin.H{
		"components": formula.Components,
		"thresholds": gin.H{
			"attendance": formula.AttendanceThreshold,
			"regterm":    formula.RegtermThreshold,
			"final":      formula.FinalThreshold,
		},
		"students": results,
	})
}

func getStudentProgress(c *gin.Context) {
	courseID := c.Param("course_id")
	rows, _ := db.Query(
		`SELECT g.user_id, u.first_name, u.last_name,
			COALESCE(SUM(g.weight), 0) as total_weight,
			COALESCE(SUM(CASE WHEN g.max_score > 0 THEN (g.score / g.max_score) * g.weight ELSE 0 END), 0) as earned
		FROM grades g JOIN users u ON g.user_id=u.id
		WHERE g.course_id=$1
		GROUP BY g.user_id, u.first_name, u.last_name
		ORDER BY u.last_name`, courseID)
	defer rows.Close()
	var progress []gin.H
	for rows.Next() {
		var uid, fn, ln string
		var totalWeight, earned float64
		rows.Scan(&uid, &fn, &ln, &totalWeight, &earned)
		progress = append(progress, gin.H{
			"user_id": uid, "first_name": fn, "last_name": ln,
			"total_weight": math.Round(totalWeight*100) / 100,
			"earned": math.Round(earned*100) / 100,
			"percentage": func() float64 {
				if totalWeight == 0 { return 0 }
				return math.Round((earned / totalWeight) * 10000) / 100
			}(),
		})
	}
	if progress == nil {
		progress = []gin.H{}
	}
	// Also return what weights are used per component
	var usedWeight float64
	db.QueryRow(`SELECT COALESCE(SUM(DISTINCT weight), 0) FROM (
		SELECT component, MAX(weight) as weight FROM grades WHERE course_id=$1 GROUP BY component
	) sub`, courseID).Scan(&usedWeight)
	c.JSON(200, gin.H{"progress": progress, "used_weight": math.Round(usedWeight*100) / 100, "max_weight": 100})
}

func createGrade(c *gin.Context) {
	var req struct {
		CourseID  string   `json:"course_id" binding:"required"`
		UserID   string   `json:"user_id" binding:"required"`
		Component string  `json:"component" binding:"required"`
		Score    float64  `json:"score"`
		MaxScore float64  `json:"max_score"`
		Weight   float64  `json:"weight"`
		Comment  *string  `json:"comment"`
		GradedBy *string  `json:"graded_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	// Validate weight: check total used weight for this component won't exceed 100
	if req.Weight < 0 {
		c.JSON(400, gin.H{"error": "weight must be >= 0"})
		return
	}
	if req.Weight > 100 {
		c.JSON(400, gin.H{"error": "weight cannot exceed 100"})
		return
	}
	// Check if adding this weight would exceed 100 for this user in this course
	var currentWeight float64
	db.QueryRow(`SELECT COALESCE(SUM(weight), 0) FROM grades WHERE course_id=$1 AND user_id=$2`,
		req.CourseID, req.UserID).Scan(&currentWeight)
	if currentWeight+req.Weight > 100 {
		c.JSON(400, gin.H{"error": fmt.Sprintf("Total weight would exceed 100 (current: %.0f, adding: %.0f)", currentWeight, req.Weight)})
		return
	}
	id := uuid.New().String()
	db.Exec(`INSERT INTO grades (id,course_id,user_id,component,score,max_score,weight,comment,graded_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		id, req.CourseID, req.UserID, req.Component, req.Score, req.MaxScore, req.Weight, req.Comment, req.GradedBy)
	c.JSON(201, gin.H{"id": id})
}

func updateGrade(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Score    *float64 `json:"score"`
		Comment  *string  `json:"comment"`
		Reason   string   `json:"reason" binding:"required"`
		ChangedBy string  `json:"changed_by" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	var oldScore *float64
	db.QueryRow("SELECT score FROM grades WHERE id=$1", id).Scan(&oldScore)

	db.Exec("UPDATE grades SET score=COALESCE($1,score), comment=COALESCE($2,comment), updated_at=NOW() WHERE id=$3",
		req.Score, req.Comment, id)

	auditID := uuid.New().String()
	db.Exec(`INSERT INTO grade_audit_log (id,grade_id,changed_by,old_score,new_score,reason) VALUES ($1,$2,$3,$4,$5,$6)`,
		auditID, id, req.ChangedBy, oldScore, req.Score, req.Reason)

	c.JSON(200, gin.H{"message": "grade updated", "audit_id": auditID})
}

func getGPAFormula(c *gin.Context) {
	courseID := c.Param("course_id")
	var id string
	var components []byte
	var rules []byte
	var scale string
	var threshold, attThreshold, regThreshold, finThreshold sql.NullFloat64
	var rulesSummer []byte

	err := db.QueryRow(`SELECT id, components, rules, grading_scale, fx_threshold, 
		attendance_threshold, regterm_threshold, final_threshold, summer_trimester_rules 
		FROM gpa_formulas WHERE course_id=$1`, courseID).
		Scan(&id, &components, &rules, &scale, &threshold, &attThreshold, &regThreshold, &finThreshold, &rulesSummer)
	
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(404, gin.H{"error": "no formula set"})
		} else {
			log.Printf("Error fetching formula: %v", err)
			c.JSON(500, gin.H{"error": "database error"})
		}
		return
	}
	var comp interface{}
	var rls interface{}
	var rsSummer interface{}
	json.Unmarshal(components, &comp)
	json.Unmarshal(rules, &rls)
	json.Unmarshal(rulesSummer, &rsSummer)
	
	// Set defaults if null
	f_threshold := 50.0; if threshold.Valid { f_threshold = threshold.Float64 }
	a_threshold := 70.0; if attThreshold.Valid { a_threshold = attThreshold.Float64 }
	r_threshold := 50.0; if regThreshold.Valid { r_threshold = regThreshold.Float64 }
	fn_threshold := 50.0; if finThreshold.Valid { fn_threshold = finThreshold.Float64 }

	c.JSON(200, gin.H{
		"id":                     id, 
		"components":             comp, 
		"rules":                  rls, 
		"grading_scale":          scale, 
		"fx_threshold":           f_threshold,
		"attendance_threshold":   a_threshold,
		"regterm_threshold":      r_threshold,
		"final_threshold":        fn_threshold,
		"summer_trimester_rules": rsSummer,
	})
}

func createGPAFormula(c *gin.Context) {
	var req struct {
		CourseID            string      `json:"course_id" binding:"required"`
		Components          interface{} `json:"components" binding:"required"`
		Rules               interface{} `json:"rules"`
		GradingScale        string      `json:"grading_scale"`
		FXThreshold         *float64    `json:"fx_threshold"`
		AttendanceThreshold *float64    `json:"attendance_threshold"`
		RegtermThreshold    *float64    `json:"regterm_threshold"`
		FinalThreshold      *float64    `json:"final_threshold"`
		SummerTrimesterRules interface{} `json:"summer_trimester_rules"`
		CreatedBy           *string     `json:"created_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	compJSON, _ := json.Marshal(req.Components)
	
	rulesJSON := []byte("[]")
	if req.Rules != nil {
		rulesJSON, _ = json.Marshal(req.Rules)
	}

	rulesSummerJSON := []byte("{}")
	if req.SummerTrimesterRules != nil {
		rulesSummerJSON, _ = json.Marshal(req.SummerTrimesterRules)
	}

	scale := "percentage"; if req.GradingScale != "" { scale = req.GradingScale }
	threshold := 50.0; if req.FXThreshold != nil { threshold = *req.FXThreshold }
	attThreshold := 70.0; if req.AttendanceThreshold != nil { attThreshold = *req.AttendanceThreshold }
	regThreshold := 50.0; if req.RegtermThreshold != nil { regThreshold = *req.RegtermThreshold }
	finThreshold := 50.0; if req.FinalThreshold != nil { finThreshold = *req.FinalThreshold }

	_, err := db.Exec(`INSERT INTO gpa_formulas (id, course_id, components, rules, grading_scale, fx_threshold, 
		attendance_threshold, regterm_threshold, final_threshold, summer_trimester_rules, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (course_id) DO UPDATE SET 
		components=EXCLUDED.components, rules=EXCLUDED.rules, grading_scale=EXCLUDED.grading_scale, 
		fx_threshold=EXCLUDED.fx_threshold, attendance_threshold=EXCLUDED.attendance_threshold, 
		regterm_threshold=EXCLUDED.regterm_threshold, final_threshold=EXCLUDED.final_threshold, 
		summer_trimester_rules=EXCLUDED.summer_trimester_rules, updated_at=NOW()`, 
		id, req.CourseID, compJSON, rulesJSON, scale, threshold, 
		attThreshold, regThreshold, finThreshold, rulesSummerJSON, req.CreatedBy)
	
	if err != nil {
		log.Printf("Error in createGPAFormula (UPSERT): %v", err)
		c.JSON(500, gin.H{"error": "failed to save formula: " + err.Error()})
		return
	}
	
	c.JSON(201, gin.H{"message": "formula saved"})
}

func updateGPAFormula(c *gin.Context) {
	id := c.Param("id")
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	query := "UPDATE gpa_formulas SET updated_at=NOW()"
	params := []interface{}{}
	paramIdx := 1

	for key, val := range req {
		// Handle JSON fields
		if key == "components" || key == "rules" || key == "summer_trimester_rules" {
			j, _ := json.Marshal(val)
			query += fmt.Sprintf(", %s=$%d", key, paramIdx); params = append(params, j); paramIdx++
		} else if key == "grading_scale" || key == "fx_threshold" || key == "attendance_threshold" || 
		          key == "regterm_threshold" || key == "final_threshold" {
			query += fmt.Sprintf(", %s=$%d", key, paramIdx); params = append(params, val); paramIdx++
		}
	}

	query += fmt.Sprintf(" WHERE id=$%d", paramIdx)
	params = append(params, id)

	result, err := db.Exec(query, params...)
	if err != nil {
		log.Printf("Error updating formula %s: %v", id, err)
		c.JSON(500, gin.H{"error": "failed to update formula: " + err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	log.Printf("Update GPA Formula %s: query=%s, params=%v, affected=%d", id, query, params, rows)
	if rows == 0 {
		c.JSON(404, gin.H{"error": "formula not found with given ID"})
		return
	}
	
	c.JSON(200, gin.H{"message": "formula updated successfully"})
}


func listAssignments(c *gin.Context) {
	courseID := c.Query("course_id")
	roleVal, _ := c.Get("role")
	role, _ := roleVal.(string)
	userIDVal, _ := c.Get("userID")
	userID, _ := userIDVal.(string)

	// Students can only see assignments for courses they have access to
	if role == "student" && courseID != "" && userID != "" {
		if !isEnrolledOrGroupMember(userID, courseID) {
			c.JSON(200, gin.H{"assignments": []gin.H{}})
			return
		}
	}

	query := `SELECT id, course_id, section_id, title_en, title_ru, title_kk, description_en, max_score,
		file_url, link_url, allowed_formats, max_file_size_mb, max_files, allow_late_submission, due_date, is_published, created_at, grading_component_id
		FROM assignments`
	args := []interface{}{}
	if courseID != "" {
		if role == "student" {
			query += " WHERE course_id=$1 AND is_published=true"
		} else {
			query += " WHERE course_id=$1"
		}
		args = append(args, courseID)
	}
	query += " ORDER BY created_at DESC"
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var assignments []gin.H
	for rows.Next() {
		var id, cid, te string
		var sid, tr, tk, de, fu, lu, gcid *string
		var ms float64
		var af []byte
		var mfs, mf int
		var als, pub bool
		var dd *time.Time
		var ca time.Time
		rows.Scan(&id, &cid, &sid, &te, &tr, &tk, &de, &ms, &fu, &lu, &af, &mfs, &mf, &als, &dd, &pub, &ca, &gcid)
		var formats interface{}
		json.Unmarshal(af, &formats)
		assignments = append(assignments, gin.H{"id": id, "course_id": cid, "section_id": sid, "grading_component_id": gcid,
			"title_en": te, "title_ru": tr, "title_kk": tk, "description_en": de,
			"max_score": ms, "file_url": fu, "link_url": lu, "allowed_formats": formats,
			"max_file_size_mb": mfs, "max_files": mf, "allow_late_submission": als, "due_date": dd,
			"is_published": pub, "created_at": ca})
	}
	if assignments == nil {
		assignments = []gin.H{}
	}
	c.JSON(200, gin.H{"assignments": assignments})
}

func getAssignment(c *gin.Context) {
	id := c.Param("id")
	var a struct {
		ID          string     `json:"id"`
		CourseID    string     `json:"course_id"`
		SectionID   *string   `json:"section_id"`
		GradingCompID *string  `json:"grading_component_id"`
		TitleEN     string     `json:"title_en"`
		TitleRU     *string    `json:"title_ru"`
		TitleKK     *string    `json:"title_kk"`
		DescEN      *string    `json:"description_en"`
		DescRU      *string    `json:"description_ru"`
		DescKK      *string    `json:"description_kk"`
		MaxScore    float64    `json:"max_score"`
		FileURL     *string    `json:"file_url"`
		LinkURL     *string    `json:"link_url"`
		AllowedFmt  []byte     `json:"-"`
		MaxFileMB   int        `json:"max_file_size_mb"`
		MaxFiles    int        `json:"max_files"`
		AllowLate   bool       `json:"allow_late_submission"`
		DueDate     *time.Time `json:"due_date"`
		IsPublished bool       `json:"is_published"`
		CreatedAt   time.Time  `json:"created_at"`
	}
	err := db.QueryRow(`SELECT id, course_id, section_id, grading_component_id, title_en, title_ru, title_kk,
		description_en, description_ru, description_kk, max_score, file_url, link_url,
		allowed_formats, max_file_size_mb, max_files, allow_late_submission, due_date, is_published, created_at
		FROM assignments WHERE id=$1`, id).Scan(
		&a.ID, &a.CourseID, &a.SectionID, &a.GradingCompID, &a.TitleEN, &a.TitleRU, &a.TitleKK,
		&a.DescEN, &a.DescRU, &a.DescKK, &a.MaxScore, &a.FileURL, &a.LinkURL,
		&a.AllowedFmt, &a.MaxFileMB, &a.MaxFiles, &a.AllowLate, &a.DueDate, &a.IsPublished, &a.CreatedAt)
	if err != nil {
		c.JSON(404, gin.H{"error": "assignment not found"})
		return
	}
	var formats interface{}
	json.Unmarshal(a.AllowedFmt, &formats)
	c.JSON(200, gin.H{"id": a.ID, "course_id": a.CourseID, "section_id": a.SectionID, "grading_component_id": a.GradingCompID,
		"title_en": a.TitleEN, "title_ru": a.TitleRU, "title_kk": a.TitleKK,
		"description_en": a.DescEN, "description_ru": a.DescRU, "description_kk": a.DescKK,
		"max_score": a.MaxScore, "file_url": a.FileURL, "link_url": a.LinkURL,
		"allowed_formats": formats, "max_file_size_mb": a.MaxFileMB, "max_files": a.MaxFiles,
		"allow_late_submission": a.AllowLate, "due_date": a.DueDate,
		"is_published": a.IsPublished, "created_at": a.CreatedAt})
}

func createAssignment(c *gin.Context) {
	var req struct {
		CourseID    string     `json:"course_id" binding:"required"`
		SectionID   *string   `json:"section_id"`
		MaterialID  *string   `json:"material_id"`
		GradingCompID *string  `json:"grading_component_id"`
		TitleEN     string     `json:"title_en" binding:"required"`
		TitleRU     *string    `json:"title_ru"`
		TitleKK     *string    `json:"title_kk"`
		DescEN      *string    `json:"description_en"`
		DescRU      *string    `json:"description_ru"`
		DescKK      *string    `json:"description_kk"`
		MaxScore    *float64   `json:"max_score"`
		FileURL     *string    `json:"file_url"`
		LinkURL     *string    `json:"link_url"`
		AllowedFmt  interface{} `json:"allowed_formats"`
		MaxFileMB   *int       `json:"max_file_size_mb"`
		MaxFiles    *int       `json:"max_files"`
		AllowLate   bool       `json:"allow_late_submission"`
		DueDate     *string    `json:"due_date"`
		CreatedBy   *string    `json:"created_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	ms := 100.0
	if req.MaxScore != nil { ms = *req.MaxScore }
	mfmb := 10
	if req.MaxFileMB != nil { mfmb = *req.MaxFileMB }
	mfiles := 1
	if req.MaxFiles != nil { mfiles = *req.MaxFiles }
	var afJSON []byte
	if req.AllowedFmt != nil {
		afJSON, _ = json.Marshal(req.AllowedFmt)
	} else {
		afJSON = []byte(`["pdf","docx","jpg","png","zip"]`)
	}
	db.Exec(`INSERT INTO assignments (id,course_id,section_id,material_id,grading_component_id,title_en,title_ru,title_kk,
		description_en,description_ru,description_kk,max_score,file_url,link_url,
		allowed_formats,max_file_size_mb,max_files,allow_late_submission,due_date,is_published,created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,true,$20)`,
		id, req.CourseID, req.SectionID, req.MaterialID, req.GradingCompID, req.TitleEN, req.TitleRU, req.TitleKK,
		req.DescEN, req.DescRU, req.DescKK, ms, req.FileURL, req.LinkURL,
		afJSON, mfmb, mfiles, req.AllowLate, req.DueDate, req.CreatedBy)
	c.JSON(201, gin.H{"id": id})
}

func updateAssignment(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TitleEN     *string `json:"title_en"`
		TitleRU     *string `json:"title_ru"`
		TitleKK     *string `json:"title_kk"`
		DescEN      *string `json:"description_en"`
		GradingCompID *string  `json:"grading_component_id"`
		MaxScore    *float64 `json:"max_score"`
		MaxFiles    *int    `json:"max_files"`
		AllowLate   *bool   `json:"allow_late_submission"`
		DueDate     *string `json:"due_date"`
		IsPublished *bool   `json:"is_published"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE assignments SET title_en=COALESCE($1,title_en), title_ru=COALESCE($2,title_ru),
		title_kk=COALESCE($3,title_kk), description_en=COALESCE($4,description_en), grading_component_id=COALESCE($5,grading_component_id),
		max_score=COALESCE($6,max_score), max_files=COALESCE($7,max_files), allow_late_submission=COALESCE($8,allow_late_submission),
		due_date=COALESCE($9,due_date), is_published=COALESCE($10,is_published), updated_at=NOW() WHERE id=$11`,
		req.TitleEN, req.TitleRU, req.TitleKK, req.DescEN, req.GradingCompID, req.MaxScore, req.MaxFiles, req.AllowLate, req.DueDate, req.IsPublished, id)
	c.JSON(200, gin.H{"message": "assignment updated"})
}

func deleteAssignment(c *gin.Context) {
	db.Exec("DELETE FROM assignments WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "assignment deleted"})
}

func submitAssignment(c *gin.Context) {
	assignmentID := c.Param("id")
	var req struct {
		UserID      string      `json:"user_id" binding:"required"`
		FileURLs    interface{} `json:"file_urls"`
		LinkURL     *string     `json:"link_url"`
		TextContent *string     `json:"text_content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Use JWT userID when available; fall back to body user_id
	ctxUserIDVal, _ := c.Get("userID")
	ctxUserID, _ := ctxUserIDVal.(string)
	if ctxUserID == "" {
		ctxUserID = req.UserID
	}

	var courseID string
	var dueDate *time.Time
	var allowLate bool
	var maxFiles int
	db.QueryRow("SELECT course_id, due_date, allow_late_submission, max_files FROM assignments WHERE id=$1", assignmentID).Scan(&courseID, &dueDate, &allowLate, &maxFiles)

	// Check that the submitting user actually has access to this course
	if courseID != "" && !isEnrolledOrGroupMember(ctxUserID, courseID) {
		c.JSON(403, gin.H{"error": "you are not enrolled in this course"})
		return
	}
	
	// Check if deadline has passed
	if dueDate != nil && time.Now().After(*dueDate) && !allowLate {
		c.JSON(403, gin.H{"error": "submission deadline has passed and late submissions are not allowed"})
		return
	}
	
	isLate := dueDate != nil && time.Now().After(*dueDate)

	id := uuid.New().String()
	fileURLsJSON, _ := json.Marshal(req.FileURLs)
	
	// Validate max files if fileURLs is an array
	hasFiles := false
	if req.FileURLs != nil {
		if files, ok := req.FileURLs.([]interface{}); ok {
			hasFiles = len(files) > 0
			if len(files) > maxFiles {
				c.JSON(400, gin.H{"error": fmt.Sprintf("Too many files. Maximum allowed: %d", maxFiles)})
				return
			}
		}
	}

	hasLink := req.LinkURL != nil && *req.LinkURL != ""
	hasText := req.TextContent != nil && *req.TextContent != ""

	if !hasFiles && !hasLink && !hasText {
		c.JSON(400, gin.H{"error": "You must provide at least a file, a link, or text content"})
		return
	}

	_, err := db.Exec(`INSERT INTO assignment_submissions (id,assignment_id,user_id,file_urls,link_url,text_content,is_late)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (assignment_id, user_id) DO UPDATE SET file_urls=COALESCE($4,assignment_submissions.file_urls),
		link_url=COALESCE($5,assignment_submissions.link_url), text_content=COALESCE($6,assignment_submissions.text_content),
		is_late=$7, submitted_at=NOW()`,
		id, assignmentID, req.UserID, fileURLsJSON, req.LinkURL, req.TextContent, isLate)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(201, gin.H{"submission_id": id, "is_late": isLate})
}

func listSubmissions(c *gin.Context) {
	assignmentID := c.Param("id")
	rows, _ := db.Query(
		`SELECT s.id, s.user_id, u.first_name, u.last_name, s.file_urls, s.link_url, s.text_content,
		s.submitted_at, s.is_late, s.score, s.feedback, s.graded_at
		FROM assignment_submissions s JOIN users u ON s.user_id=u.id
		WHERE s.assignment_id=$1 ORDER BY u.last_name`, assignmentID)
	defer rows.Close()
	var submissions []gin.H
	for rows.Next() {
		var id, uid, fn, ln string
		var lu, tc, fb *string
		var fu []byte
		var sa time.Time
		var il bool
		var score *float64
		var ga *time.Time
		rows.Scan(&id, &uid, &fn, &ln, &fu, &lu, &tc, &sa, &il, &score, &fb, &ga)
		var fileURLs interface{}
		json.Unmarshal(fu, &fileURLs)
		submissions = append(submissions, gin.H{"id": id, "user_id": uid, "first_name": fn, "last_name": ln,
			"file_urls": fileURLs, "link_url": lu, "text_content": tc, "submitted_at": sa,
			"is_late": il, "score": score, "feedback": fb, "graded_at": ga})
	}
	if submissions == nil {
		submissions = []gin.H{}
	}
	c.JSON(200, gin.H{"submissions": submissions})
}

func gradeSubmission(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Score    float64 `json:"score" binding:"required"`
		Feedback *string `json:"feedback"`
		GradedBy *string `json:"graded_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	db.Exec("UPDATE assignment_submissions SET score=$1, feedback=$2, graded_by=$3, graded_at=NOW() WHERE id=$4",
		req.Score, req.Feedback, req.GradedBy, id)
	c.JSON(200, gin.H{"message": "submission graded"})
}

// isEnrolledOrGroupMember checks if a user has access to a course via direct enrollment
// or via their student group being scheduled for the course.
func isEnrolledOrGroupMember(userID, courseID string) bool {
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM enrollments WHERE course_id=$1 AND user_id=$2`, courseID, userID).Scan(&count)
	if count > 0 {
		return true
	}
	db.QueryRow(`SELECT COUNT(*) FROM course_schedule cs
		JOIN users u ON u.id = $1
		JOIN student_groups sg ON sg.id = u.group_id
		WHERE cs.course_id = $2 AND cs.group_name = sg.name`, userID, courseID).Scan(&count)
	return count > 0
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" {
			c.JSON(401, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		tokenString := ""
		if len(auth) > 7 && auth[:7] == "Bearer " {
			tokenString = auth[7:]
		} else {
			c.JSON(401, gin.H{"error": "invalid authorization header"})
			c.Abort()
			return
		}

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(jwtSecret), nil
		})

		if err != nil {
			c.JSON(401, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*Claims); ok && token.Valid {
			c.Set("userID", claims.UserID)
			c.Set("role", claims.Role)
			c.Set("roleID", claims.RoleID)
			c.Next()
		} else {
			c.JSON(401, gin.H{"error": "invalid token claims"})
			c.Abort()
			return
		}
	}
}

func permissionMiddleware(code string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleID, exists := c.Get("roleID")
		if !exists || roleID == "" {
			// If roleID is empty, check role name for system roles
			role, _ := c.Get("role")
			if role == "superadmin" || role == "rector" {
				c.Next()
				return
			}
			c.JSON(403, gin.H{"error": "forbidden: no role assigned"})
			c.Abort()
			return
		}

		// Superadmin and Rector bypass all checks
		role, _ := c.Get("role")
		if role == "superadmin" || role == "rector" {
			c.Next()
			return
		}

		var count int
		err := db.QueryRow(`
			SELECT COUNT(*) FROM role_permissions rp
			JOIN permissions p ON rp.permission_id = p.id
			WHERE rp.role_id = $1 AND p.code = $2`,
			roleID, code).Scan(&count)

		if err != nil || count == 0 {
			c.JSON(403, gin.H{"error": fmt.Sprintf("forbidden: missing permission %s", code)})
			c.Abort()
			return
		}

		c.Next()
	}
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
