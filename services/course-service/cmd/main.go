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
		c.JSON(200, gin.H{"status": "ok", "service": "course-service"})
	})

	r.GET("/courses", listCourses)
	r.GET("/courses/:id", getCourse)
	r.POST("/courses", createCourse)
	r.PUT("/courses/:id", updateCourse)
	r.DELETE("/courses/:id", deleteCourse)

	r.GET("/courses/:id/sections", listSections)
	r.POST("/courses/:id/sections", createSection)
	r.PUT("/sections/:id", updateSection)
	r.DELETE("/sections/:id", deleteSection)

	r.GET("/sections/:id/materials", listMaterials)
	r.POST("/sections/:id/materials", createMaterial)
	r.PUT("/materials/:id", updateMaterial)
	r.DELETE("/materials/:id", deleteMaterial)

	r.GET("/courses/:id/enrollments", listEnrollments)
	r.POST("/courses/:id/enroll", enrollUser)
	r.DELETE("/courses/:id/enroll/:user_id", unenrollUser)

	r.GET("/schedule", listSchedule)
	r.POST("/schedule", createSchedule)
	r.PUT("/schedule/:id", updateSchedule)
	r.DELETE("/schedule/:id", deleteSchedule)
	r.GET("/schedule/user/:user_id", getUserSchedule)

	r.GET("/sessions", listSessions)
	r.POST("/sessions", createSession)
	r.DELETE("/sessions/:id", deleteSession)
	r.GET("/sessions/user/:user_id", getUserSessions)

	port := getEnv("PORT", "8003")
	log.Printf("Course service starting on port %s", port)
	r.Run(":" + port)
}

func listCourses(c *gin.Context) {
	userID := c.Query("user_id")

	var query string
	var args []interface{}

	if userID != "" {
		query = `SELECT DISTINCT c.id, c.title_en, c.title_ru, c.title_kk, c.description_en, c.code, c.credits, c.category,
			c.cover_url, c.is_published, c.self_enrollment, c.created_at
			FROM courses c
			WHERE c.is_published = true
			AND (
				c.id IN (
					SELECT course_id FROM enrollments WHERE user_id = $1
				)
				OR c.id IN (
					SELECT cs.course_id FROM course_schedule cs
					JOIN users u ON u.id = $1
					JOIN student_groups sg ON sg.id = u.group_id
					WHERE cs.group_name = sg.name
				)
			)
			ORDER BY c.created_at DESC`
		args = []interface{}{userID}
	} else {
		query = `SELECT c.id, c.title_en, c.title_ru, c.title_kk, c.description_en, c.code, c.credits, c.category,
			c.cover_url, c.is_published, c.self_enrollment, c.created_at
			FROM courses c ORDER BY c.created_at DESC`
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var courses []gin.H
	for rows.Next() {
		var id, te string
		var tr, tk, descEN, code, cat, cover *string
		var credits *int
		var pub, selfE bool
		var created time.Time
		rows.Scan(&id, &te, &tr, &tk, &descEN, &code, &credits, &cat, &cover, &pub, &selfE, &created)
		courses = append(courses, gin.H{"id": id, "title_en": te, "title_ru": tr, "title_kk": tk,
			"description_en": descEN, "code": code, "credits": credits, "category": cat, "cover_url": cover,
			"is_published": pub, "self_enrollment": selfE, "created_at": created})
	}
	if courses == nil {
		courses = []gin.H{}
	}
	c.JSON(200, gin.H{"courses": courses})
}

func getCourse(c *gin.Context) {
	id := c.Param("id")

	if userID := c.Query("user_id"); userID != "" {
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM (
			SELECT 1 FROM enrollments WHERE course_id=$1 AND user_id=$2
			UNION ALL
			SELECT 1 FROM course_schedule cs
			JOIN users u ON u.id = $2
			JOIN student_groups sg ON sg.id = u.group_id
			WHERE cs.course_id = $1 AND cs.group_name = sg.name
		) sub`, id, userID).Scan(&count)
		if count == 0 {
			c.JSON(403, gin.H{"error": "access denied"})
			return
		}
	}

	var course struct {
		ID             string    `json:"id"`
		TitleEN        string    `json:"title_en"`
		TitleRU        *string   `json:"title_ru"`
		TitleKK        *string   `json:"title_kk"`
		DescEN         *string   `json:"description_en"`
		DescRU         *string   `json:"description_ru"`
		DescKK         *string   `json:"description_kk"`
		Code           *string   `json:"code"`
		Credits        *int      `json:"credits"`
		Category       *string   `json:"category"`
		CoverURL       *string   `json:"cover_url"`
		SyllabusURL    *string   `json:"syllabus_url"`
		IsPublished    bool      `json:"is_published"`
		SelfEnrollment bool      `json:"self_enrollment"`
		CreatedBy      *string   `json:"created_by"`
		CreatedAt      time.Time `json:"created_at"`
	}
	err := db.QueryRow(
		`SELECT id, title_en, title_ru, title_kk, description_en, description_ru, description_kk,
		code, credits, category, cover_url, syllabus_url, is_published, self_enrollment, created_by, created_at
		FROM courses WHERE id=$1`, id,
	).Scan(&course.ID, &course.TitleEN, &course.TitleRU, &course.TitleKK,
		&course.DescEN, &course.DescRU, &course.DescKK, &course.Code, &course.Credits,
		&course.Category, &course.CoverURL, &course.SyllabusURL, &course.IsPublished,
		&course.SelfEnrollment, &course.CreatedBy, &course.CreatedAt)
	if err != nil {
		c.JSON(404, gin.H{"error": "course not found"})
		return
	}
	c.JSON(200, course)
}

func createCourse(c *gin.Context) {
	var req struct {
		TitleEN        string  `json:"title_en" binding:"required"`
		TitleRU        *string `json:"title_ru"`
		TitleKK        *string `json:"title_kk"`
		DescEN         *string `json:"description_en"`
		DescRU         *string `json:"description_ru"`
		DescKK         *string `json:"description_kk"`
		Code           *string `json:"code"`
		Credits        *int    `json:"credits"`
		Category       *string `json:"category"`
		OrgID          *string `json:"organization_id"`
		DeptID         *string `json:"department_id"`
		SelfEnrollment bool    `json:"self_enrollment"`
		CreatedBy      *string `json:"created_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	db.Exec(
		`INSERT INTO courses (id,organization_id,department_id,title_en,title_ru,title_kk,
		description_en,description_ru,description_kk,code,credits,category,self_enrollment,created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		id, req.OrgID, req.DeptID, req.TitleEN, req.TitleRU, req.TitleKK,
		req.DescEN, req.DescRU, req.DescKK, req.Code, req.Credits, req.Category,
		req.SelfEnrollment, req.CreatedBy)
	c.JSON(201, gin.H{"id": id})
}

func updateCourse(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TitleEN     *string `json:"title_en"`
		TitleRU     *string `json:"title_ru"`
		TitleKK     *string `json:"title_kk"`
		DescEN      *string `json:"description_en"`
		DescRU      *string `json:"description_ru"`
		DescKK      *string `json:"description_kk"`
		Code        *string `json:"code"`
		Credits     *int    `json:"credits"`
		Category    *string `json:"category"`
		IsPublished *bool   `json:"is_published"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(
		`UPDATE courses SET title_en=COALESCE($1,title_en), title_ru=COALESCE($2,title_ru),
		title_kk=COALESCE($3,title_kk), description_en=COALESCE($4,description_en),
		description_ru=COALESCE($5,description_ru), description_kk=COALESCE($6,description_kk),
		code=COALESCE($7,code), credits=COALESCE($8,credits), category=COALESCE($9,category),
		is_published=COALESCE($10,is_published), updated_at=NOW() WHERE id=$11`,
		req.TitleEN, req.TitleRU, req.TitleKK, req.DescEN, req.DescRU, req.DescKK,
		req.Code, req.Credits, req.Category, req.IsPublished, id)
	c.JSON(200, gin.H{"message": "course updated"})
}

func deleteCourse(c *gin.Context) {
	db.Exec("DELETE FROM courses WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "course deleted"})
}

func listSections(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT id, title_en, title_ru, title_kk, position, is_visible
		FROM course_sections WHERE course_id=$1 ORDER BY position`, c.Param("id"))
	defer rows.Close()
	var sections []gin.H
	for rows.Next() {
		var id, te string
		var tr, tk *string
		var pos int
		var vis bool
		rows.Scan(&id, &te, &tr, &tk, &pos, &vis)
		sections = append(sections, gin.H{"id": id, "title_en": te, "title_ru": tr, "title_kk": tk, "position": pos, "is_visible": vis})
	}
	if sections == nil {
		sections = []gin.H{}
	}
	c.JSON(200, gin.H{"sections": sections})
}

func createSection(c *gin.Context) {
	courseID := c.Param("id")
	var req struct {
		TitleEN  string  `json:"title_en" binding:"required"`
		TitleRU  *string `json:"title_ru"`
		TitleKK  *string `json:"title_kk"`
		Position *int    `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	pos := 0
	if req.Position != nil {
		pos = *req.Position
	}
	db.Exec(`INSERT INTO course_sections (id,course_id,title_en,title_ru,title_kk,position) VALUES ($1,$2,$3,$4,$5,$6)`,
		id, courseID, req.TitleEN, req.TitleRU, req.TitleKK, pos)
	c.JSON(201, gin.H{"id": id})
}

func updateSection(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TitleEN   *string `json:"title_en"`
		TitleRU   *string `json:"title_ru"`
		TitleKK   *string `json:"title_kk"`
		Position  *int    `json:"position"`
		IsVisible *bool   `json:"is_visible"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE course_sections SET title_en=COALESCE($1,title_en), title_ru=COALESCE($2,title_ru),
		title_kk=COALESCE($3,title_kk), position=COALESCE($4,position),
		is_visible=COALESCE($5,is_visible), updated_at=NOW() WHERE id=$6`,
		req.TitleEN, req.TitleRU, req.TitleKK, req.Position, req.IsVisible, id)
	c.JSON(200, gin.H{"message": "section updated"})
}

func deleteSection(c *gin.Context) {
	db.Exec("DELETE FROM course_sections WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "section deleted"})
}

func listMaterials(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT id, title_en, title_ru, title_kk, type, file_url, external_url, position, is_visible
		FROM course_materials WHERE section_id=$1 ORDER BY position`, c.Param("id"))
	defer rows.Close()
	var materials []gin.H
	for rows.Next() {
		var id, te, tp string
		var tr, tk, fu, eu *string
		var pos int
		var vis bool
		rows.Scan(&id, &te, &tr, &tk, &tp, &fu, &eu, &pos, &vis)
		materials = append(materials, gin.H{"id": id, "title_en": te, "title_ru": tr, "title_kk": tk,
			"type": tp, "file_url": fu, "external_url": eu, "position": pos, "is_visible": vis})
	}
	if materials == nil {
		materials = []gin.H{}
	}
	c.JSON(200, gin.H{"materials": materials})
}

func createMaterial(c *gin.Context) {
	sectionID := c.Param("id")
	var req struct {
		TitleEN     string  `json:"title_en" binding:"required"`
		TitleRU     *string `json:"title_ru"`
		TitleKK     *string `json:"title_kk"`
		Type        string  `json:"type" binding:"required"`
		Content     *string `json:"content"`
		FileURL     *string `json:"file_url"`
		ExternalURL *string `json:"external_url"`
		Position    *int    `json:"position"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	id := uuid.New().String()
	db.Exec(`INSERT INTO course_materials (id,section_id,title_en,title_ru,title_kk,type,content,file_url,external_url,position)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, sectionID, req.TitleEN, req.TitleRU, req.TitleKK, req.Type, req.Content, req.FileURL, req.ExternalURL, req.Position)
	c.JSON(201, gin.H{"id": id})
}

func updateMaterial(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		TitleEN *string `json:"title_en"`
		TitleRU *string `json:"title_ru"`
		TitleKK *string `json:"title_kk"`
		Content *string `json:"content"`
		FileURL *string `json:"file_url"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE course_materials SET title_en=COALESCE($1,title_en), title_ru=COALESCE($2,title_ru),
		title_kk=COALESCE($3,title_kk), content=COALESCE($4,content),
		file_url=COALESCE($5,file_url), updated_at=NOW() WHERE id=$6`,
		req.TitleEN, req.TitleRU, req.TitleKK, req.Content, req.FileURL, id)
	c.JSON(200, gin.H{"message": "material updated"})
}

func deleteMaterial(c *gin.Context) {
	db.Exec("DELETE FROM course_materials WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "material deleted"})
}

func listEnrollments(c *gin.Context) {
	rows, _ := db.Query(
		`SELECT e.id, e.user_id, u.first_name, u.last_name, u.email, e.role, e.enrolled_at
		FROM enrollments e JOIN users u ON e.user_id=u.id WHERE e.course_id=$1`, c.Param("id"))
	defer rows.Close()
	var enrollments []gin.H
	for rows.Next() {
		var id, uid, fn, ln, email, role string
		var enrolled time.Time
		rows.Scan(&id, &uid, &fn, &ln, &email, &role, &enrolled)
		enrollments = append(enrollments, gin.H{"id": id, "user_id": uid, "first_name": fn, "last_name": ln, "email": email, "role": role, "enrolled_at": enrolled})
	}
	if enrollments == nil {
		enrollments = []gin.H{}
	}
	c.JSON(200, gin.H{"enrollments": enrollments})
}

func enrollUser(c *gin.Context) {
	courseID := c.Param("id")
	var req struct {
		UserID string `json:"user_id" binding:"required"`
		Role   string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Role == "" {
		req.Role = "student"
	}
	id := uuid.New().String()
	_, err := db.Exec(`INSERT INTO enrollments (id,course_id,user_id,role) VALUES ($1,$2,$3,$4)`,
		id, courseID, req.UserID, req.Role)
	if err != nil {
		c.JSON(409, gin.H{"error": "already enrolled"})
		return
	}
	c.JSON(201, gin.H{"id": id})
}

func unenrollUser(c *gin.Context) {
	db.Exec("DELETE FROM enrollments WHERE course_id=$1 AND user_id=$2", c.Param("id"), c.Param("user_id"))
	c.JSON(200, gin.H{"message": "unenrolled"})
}

func listSchedule(c *gin.Context) {
	courseID := c.Query("course_id")
	query := `SELECT s.id, s.course_id, c.title_en, s.day_of_week, s.start_time, s.end_time, s.room, s.type, s.group_name, s.custom_type_name
		FROM course_schedule s JOIN courses c ON s.course_id=c.id`
	args := []interface{}{}
	if courseID != "" {
		query += " WHERE s.course_id=$1"
		args = append(args, courseID)
	}
	query += " ORDER BY s.day_of_week, s.start_time"
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var slots []gin.H
	for rows.Next() {
		var id, cid, title string
		var dow int
		var st, et time.Time
		var room, tp, gn, ctn *string
		rows.Scan(&id, &cid, &title, &dow, &st, &et, &room, &tp, &gn, &ctn)
		slots = append(slots, gin.H{"id": id, "course_id": cid, "course_title": title,
			"day_of_week": dow, "start_time": st.Format("15:04"), "end_time": et.Format("15:04"), "room": room, "type": tp, "group_name": gn, "custom_type_name": ctn})
	}
	if slots == nil {
		slots = []gin.H{}
	}
	c.JSON(200, gin.H{"schedule": slots})
}

func createSchedule(c *gin.Context) {
	var req struct {
		CourseID       string  `json:"course_id" binding:"required"`
		DayOfWeek      int     `json:"day_of_week"`
		StartTime      string  `json:"start_time" binding:"required"`
		EndTime        string  `json:"end_time" binding:"required"`
		Room           *string `json:"room"`
		Type           string  `json:"type"`
		CustomTypeName *string `json:"custom_type_name"`
		GroupName      *string `json:"group_name"`
		CreatedBy      *string `json:"created_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Type == "" {
		req.Type = "lecture"
	}
	id := uuid.New().String()
	_, err := db.Exec(
		`INSERT INTO course_schedule (id,course_id,day_of_week,start_time,end_time,room,type,custom_type_name,group_name,created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
		id, req.CourseID, req.DayOfWeek, req.StartTime, req.EndTime, req.Room, req.Type, req.CustomTypeName, req.GroupName, req.CreatedBy)
	if err != nil {
		c.JSON(409, gin.H{"error": "schedule conflict: this course already has a pair on this day"})
		return
	}
	c.JSON(201, gin.H{"id": id})
}

func updateSchedule(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		DayOfWeek *int    `json:"day_of_week"`
		StartTime *string `json:"start_time"`
		EndTime   *string `json:"end_time"`
		Room      *string `json:"room"`
		Type      *string `json:"type"`
		GroupName *string `json:"group_name"`
	}
	c.ShouldBindJSON(&req)
	db.Exec(`UPDATE course_schedule SET day_of_week=COALESCE($1,day_of_week), start_time=COALESCE($2,start_time),
		end_time=COALESCE($3,end_time), room=COALESCE($4,room), type=COALESCE($5,type),
		group_name=COALESCE($6,group_name), updated_at=NOW() WHERE id=$7`,
		req.DayOfWeek, req.StartTime, req.EndTime, req.Room, req.Type, req.GroupName, id)
	c.JSON(200, gin.H{"message": "schedule updated"})
}

func deleteSchedule(c *gin.Context) {
	db.Exec("DELETE FROM course_schedule WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "schedule deleted"})
}

func getUserSchedule(c *gin.Context) {
	userID := c.Param("user_id")
	rows, err := db.Query(
		`SELECT s.id, s.course_id, c.title_en, s.day_of_week, s.start_time, s.end_time, s.room, s.type, s.group_name, s.custom_type_name
		FROM course_schedule s
		JOIN courses c ON s.course_id=c.id
		WHERE s.course_id IN (
			SELECT course_id FROM enrollments WHERE user_id=$1
			UNION SELECT id FROM courses WHERE created_by=$1
		)
		ORDER BY s.day_of_week, s.start_time`, userID)
	if err != nil {
		c.JSON(200, gin.H{"schedule": []gin.H{}})
		return
	}
	defer rows.Close()
	var slots []gin.H
	for rows.Next() {
		var id, cid, title string
		var dow int
		var st, et time.Time
		var room, tp, gn, ctn *string
		rows.Scan(&id, &cid, &title, &dow, &st, &et, &room, &tp, &gn, &ctn)
		slots = append(slots, gin.H{"id": id, "course_id": cid, "course_title": title,
			"day_of_week": dow, "start_time": st.Format("15:04"), "end_time": et.Format("15:04"), "room": room, "type": tp, "group_name": gn, "custom_type_name": ctn})
	}
	if slots == nil {
		slots = []gin.H{}
	}
	c.JSON(200, gin.H{"schedule": slots})
}


func listSessions(c *gin.Context) {
	courseID := c.Query("course_id")
	from := c.Query("from")
	to := c.Query("to")
	query := `SELECT s.id, s.course_id, c.title_en, s.date, s.start_time, s.end_time, s.type, s.custom_type_name, s.room
		FROM class_sessions s JOIN courses c ON s.course_id=c.id`
	args := []interface{}{}
	conditions := []string{}
	idx := 1
	if courseID != "" {
		conditions = append(conditions, fmt.Sprintf("s.course_id=$%d", idx))
		args = append(args, courseID)
		idx++
	}
	if from != "" {
		conditions = append(conditions, fmt.Sprintf("s.date>=$%d", idx))
		args = append(args, from)
		idx++
	}
	if to != "" {
		conditions = append(conditions, fmt.Sprintf("s.date<=$%d", idx))
		args = append(args, to)
		idx++
	}
	if len(conditions) > 0 {
		query += " WHERE "
		for i, cond := range conditions {
			if i > 0 {
				query += " AND "
			}
			query += cond
		}
	}
	query += " ORDER BY s.date, s.start_time"
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	var sessions []gin.H
	for rows.Next() {
		var id, cid, title string
		var d, st, et time.Time
		var tp string
		var ctn, room *string
		rows.Scan(&id, &cid, &title, &d, &st, &et, &tp, &ctn, &room)
		sessions = append(sessions, gin.H{"id": id, "course_id": cid, "course_title": title,
			"date": d.Format("2006-01-02"), "start_time": st.Format("15:04"), "end_time": et.Format("15:04"),
			"type": tp, "custom_type_name": ctn, "room": room})
	}
	if sessions == nil {
		sessions = []gin.H{}
	}
	c.JSON(200, gin.H{"sessions": sessions})
}

func createSession(c *gin.Context) {
	var req struct {
		CourseID       string  `json:"course_id" binding:"required"`
		Date           string  `json:"date" binding:"required"`
		StartTime      string  `json:"start_time" binding:"required"`
		EndTime        string  `json:"end_time" binding:"required"`
		Type           string  `json:"type"`
		CustomTypeName *string `json:"custom_type_name"`
		Room           *string `json:"room"`
		CreatedBy      *string `json:"created_by"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if req.Type == "" {
		req.Type = "lecture"
	}
	id := uuid.New().String()
	db.Exec(`INSERT INTO class_sessions (id,course_id,date,start_time,end_time,type,custom_type_name,room,created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		id, req.CourseID, req.Date, req.StartTime, req.EndTime, req.Type, req.CustomTypeName, req.Room, req.CreatedBy)
	c.JSON(201, gin.H{"id": id})
}

func deleteSession(c *gin.Context) {
	db.Exec("DELETE FROM class_sessions WHERE id=$1", c.Param("id"))
	c.JSON(200, gin.H{"message": "session deleted"})
}

func getUserSessions(c *gin.Context) {
	userID := c.Param("user_id")
	from := c.Query("from")
	to := c.Query("to")
	query := `SELECT s.id, s.course_id, c.title_en, s.date, s.start_time, s.end_time, s.type, s.custom_type_name, s.room
		FROM class_sessions s
		JOIN courses c ON s.course_id=c.id
		WHERE s.course_id IN (
			SELECT course_id FROM enrollments WHERE user_id=$1
			UNION SELECT id FROM courses WHERE created_by=$1
		)`
	args := []interface{}{userID}
	idx := 2
	if from != "" {
		query += fmt.Sprintf(" AND s.date>=$%d", idx)
		args = append(args, from)
		idx++
	}
	if to != "" {
		query += fmt.Sprintf(" AND s.date<=$%d", idx)
		args = append(args, to)
		idx++
	}
	query += " ORDER BY s.date, s.start_time"
	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(200, gin.H{"sessions": []gin.H{}})
		return
	}
	defer rows.Close()
	var sessions []gin.H
	for rows.Next() {
		var id, cid, title string
		var d, st, et time.Time
		var tp string
		var ctn, room *string
		rows.Scan(&id, &cid, &title, &d, &st, &et, &tp, &ctn, &room)
		sessions = append(sessions, gin.H{"id": id, "course_id": cid, "course_title": title,
			"date": d.Format("2006-01-02"), "start_time": st.Format("15:04"), "end_time": et.Format("15:04"),
			"type": tp, "custom_type_name": ctn, "room": room})
	}
	if sessions == nil {
		sessions = []gin.H{}
	}
	c.JSON(200, gin.H{"sessions": sessions})
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
