package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var (
	db          *sql.DB
	minioClient *minio.Client
	bucketName  string
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

	useSSL := getEnv("MINIO_USE_SSL", "false") == "true"
	minioClient, err = minio.New(getEnv("MINIO_ENDPOINT", "localhost:9000"), &minio.Options{
		Creds:  credentials.NewStaticV4(getEnv("MINIO_ACCESS_KEY", ""), getEnv("MINIO_SECRET_KEY", ""), ""),
		Secure: useSSL,
	})
	if err != nil {
		log.Fatal(err)
	}

	bucketName = getEnv("MINIO_BUCKET", "edulms-files")
	ctx := context.Background()
	exists, _ := minioClient.BucketExists(ctx, bucketName)
	if !exists {
		minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), corsMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "media-service"})
	})

	r.POST("/upload", uploadFile)
	r.GET("/files", listFiles)
	r.GET("/files/:id", getFile)
	r.GET("/files/:id/download", downloadFile)
	r.DELETE("/files/:id", deleteFile)

	port := getEnv("PORT", "8007")
	log.Printf("Media service starting on port %s", port)
	r.Run(":" + port)
}

func uploadFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "file required"})
		return
	}
	defer file.Close()

	id := uuid.New().String()
	ext := filepath.Ext(header.Filename)
	storedName := fmt.Sprintf("%s%s", id, ext)
	uploadedBy := c.PostForm("uploaded_by")

	_, err = minioClient.PutObject(context.Background(), bucketName, storedName, file, header.Size,
		minio.PutObjectOptions{ContentType: header.Header.Get("Content-Type")})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	db.Exec(
		`INSERT INTO file_metadata (id,original_name,stored_name,mime_type,size_bytes,bucket,path,uploaded_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		id, header.Filename, storedName, header.Header.Get("Content-Type"), header.Size, bucketName, storedName, uploadedBy)

	c.JSON(201, gin.H{"id": id, "filename": header.Filename, "size": header.Size})
}

func listFiles(c *gin.Context) {
	uploadedBy := c.Query("uploaded_by")
	query := "SELECT id, original_name, mime_type, size_bytes, created_at FROM file_metadata"
	args := []interface{}{}
	if uploadedBy != "" {
		query += " WHERE uploaded_by=$1"
		args = append(args, uploadedBy)
	}
	query += " ORDER BY created_at DESC"
	rows, _ := db.Query(query, args...)
	defer rows.Close()
	var files []gin.H
	for rows.Next() {
		var id, name string
		var mime *string
		var size int64
		var created time.Time
		rows.Scan(&id, &name, &mime, &size, &created)
		files = append(files, gin.H{"id": id, "original_name": name, "mime_type": mime, "size_bytes": size, "created_at": created})
	}
	if files == nil {
		files = []gin.H{}
	}
	c.JSON(200, gin.H{"files": files})
}

func getFile(c *gin.Context) {
	id := c.Param("id")
	var name, stored string
	var mime *string
	var size int64
	var created time.Time
	err := db.QueryRow("SELECT original_name, stored_name, mime_type, size_bytes, created_at FROM file_metadata WHERE id=$1", id).
		Scan(&name, &stored, &mime, &size, &created)
	if err != nil {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}
	c.JSON(200, gin.H{"id": id, "original_name": name, "stored_name": stored, "mime_type": mime, "size_bytes": size, "created_at": created})
}

func downloadFile(c *gin.Context) {
	id := c.Param("id")
	var stored, name string
	var mime *string
	err := db.QueryRow("SELECT stored_name, original_name, mime_type FROM file_metadata WHERE id=$1", id).
		Scan(&stored, &name, &mime)
	if err != nil {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}

	object, err := minioClient.GetObject(context.Background(), bucketName, stored, minio.GetObjectOptions{})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer object.Close()

	contentType := "application/octet-stream"
	if mime != nil {
		contentType = *mime
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", name))
	c.Header("Content-Type", contentType)
	c.DataFromReader(200, -1, contentType, object, nil)
}

func deleteFile(c *gin.Context) {
	id := c.Param("id")
	var stored string
	err := db.QueryRow("SELECT stored_name FROM file_metadata WHERE id=$1", id).Scan(&stored)
	if err != nil {
		c.JSON(404, gin.H{"error": "file not found"})
		return
	}
	minioClient.RemoveObject(context.Background(), bucketName, stored, minio.RemoveObjectOptions{})
	db.Exec("DELETE FROM file_metadata WHERE id=$1", id)
	c.JSON(200, gin.H{"message": "file deleted"})
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
