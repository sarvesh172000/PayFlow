package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"github.com/sirupsen/logrus"
)

var (
	db     *sql.DB
	rdb    *redis.Client
	logger *logrus.Logger
)

type TransferRequest struct {
	SenderID       int     `json:"sender_id" binding:"required"`
	ReceiverID     int     `json:"receiver_id" binding:"required"`
	Amount         float64 `json:"amount" binding:"required,gt=0"`
	Description    string  `json:"description"`
	IdempotencyKey string  `json:"idempotency_key" binding:"required"`
}

type TransferResponse struct {
	TransactionID string  `json:"transaction_id"`
	Status        string  `json:"status"`
	Amount        float64 `json:"amount"`
	SenderBalance float64 `json:"sender_balance"`
	Message       string  `json:"message"`
}

type ErrorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func init() {
	logger = logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetOutput(os.Stdout)
	logger.SetLevel(logrus.InfoLevel)
}

func main() {
	// Initialize database connection
	var err error
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://payflow_user:payflow_pass@localhost:5432/payflow?sslmode=disable"
	}

	db, err = sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatal("Database ping failed:", err)
	}
	logger.Info("Connected to PostgreSQL database")

	// Initialize Redis connection
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379"
	}

	rdb = redis.NewClient(&redis.Options{
		Addr:     redisURL,
		Password: "",
		DB:       0,
	})

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	logger.Info("Connected to Redis")

	// Setup Gin router
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(loggingMiddleware())
	router.Use(corsMiddleware())

	// Health check endpoint
	router.GET("/health", healthCheck)

	// Transfer endpoint
	router.POST("/transfer", processTransfer)

	// Get transaction by ID
	router.GET("/transaction/:id", getTransaction)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logger.Infof("Ledger service starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func loggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		duration := time.Since(start)
		status := c.Writer.Status()

		logger.WithFields(logrus.Fields{
			"method":   method,
			"path":     path,
			"status":   status,
			"duration": duration.Milliseconds(),
			"ip":       c.ClientIP(),
		}).Info("Request processed")
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func healthCheck(c *gin.Context) {
	// Check database
	dbStatus := "healthy"
	if err := db.Ping(); err != nil {
		dbStatus = "unhealthy"
	}

	// Check Redis
	redisStatus := "healthy"
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		redisStatus = "unhealthy"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"service":  "ledger-service",
		"database": dbStatus,
		"redis":    redisStatus,
		"time":     time.Now().UTC(),
	})
}

func processTransfer(c *gin.Context) {
	var req TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_REQUEST",
			Code:    "400",
			Message: "Invalid request payload: " + err.Error(),
		})
		return
	}

	// Validate sender and receiver are different
	if req.SenderID == req.ReceiverID {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_TRANSFER",
			Code:    "400",
			Message: "Cannot transfer to the same account",
		})
		return
	}

	// Check idempotency key
	ctx := context.Background()
	existingTxnID, err := checkIdempotencyKey(ctx, req.IdempotencyKey)
	if err != nil {
		logger.WithError(err).Error("Failed to check idempotency key")
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Code:    "500",
			Message: "Failed to process request",
		})
		return
	}

	// If idempotency key exists, return existing transaction
	if existingTxnID != "" {
		txn, err := getTransactionByID(existingTxnID)
		if err == nil {
			c.JSON(http.StatusOK, TransferResponse{
				TransactionID: txn.ID,
				Status:        txn.Status,
				Amount:        txn.Amount,
				Message:       "Transaction already processed (idempotent)",
			})
			return
		}
	}

	// Execute transfer with ACID guarantees
	txnID, senderBalance, err := executeTransfer(req)
	if err != nil {
		logger.WithError(err).WithFields(logrus.Fields{
			"sender_id":   req.SenderID,
			"receiver_id": req.ReceiverID,
			"amount":      req.Amount,
		}).Error("Transfer failed")

		statusCode := http.StatusInternalServerError
		errorCode := "TRANSFER_FAILED"
		errorMsg := err.Error()

		if err.Error() == "insufficient balance" {
			statusCode = http.StatusBadRequest
			errorCode = "INSUFFICIENT_BALANCE"
		} else if err.Error() == "sender not found" || err.Error() == "receiver not found" {
			statusCode = http.StatusNotFound
			errorCode = "USER_NOT_FOUND"
		}

		c.JSON(statusCode, ErrorResponse{
			Error:   errorCode,
			Code:    fmt.Sprintf("%d", statusCode),
			Message: errorMsg,
		})
		return
	}

	// Store idempotency key
	if err := storeIdempotencyKey(ctx, req.IdempotencyKey, txnID); err != nil {
		logger.WithError(err).Warn("Failed to store idempotency key")
	}

	// Invalidate cache for both users
	invalidateWalletCache(ctx, req.SenderID)
	invalidateWalletCache(ctx, req.ReceiverID)

	logger.WithFields(logrus.Fields{
		"transaction_id": txnID,
		"sender_id":      req.SenderID,
		"receiver_id":    req.ReceiverID,
		"amount":         req.Amount,
	}).Info("Transfer completed successfully")

	c.JSON(http.StatusOK, TransferResponse{
		TransactionID: txnID,
		Status:        "completed",
		Amount:        req.Amount,
		SenderBalance: senderBalance,
		Message:       "Transfer completed successfully",
	})
}

func executeTransfer(req TransferRequest) (string, float64, error) {
	// Start database transaction
	tx, err := db.Begin()
	if err != nil {
		return "", 0, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Lock sender's wallet row (FOR UPDATE prevents concurrent modifications)
	var senderBalance float64
	err = tx.QueryRow(`
		SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE
	`, req.SenderID).Scan(&senderBalance)

	if err == sql.ErrNoRows {
		return "", 0, fmt.Errorf("sender not found")
	}
	if err != nil {
		return "", 0, fmt.Errorf("failed to lock sender wallet: %w", err)
	}

	// Check sufficient balance
	if senderBalance < req.Amount {
		return "", 0, fmt.Errorf("insufficient balance")
	}

	// Lock receiver's wallet row
	var receiverBalance float64
	err = tx.QueryRow(`
		SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE
	`, req.ReceiverID).Scan(&receiverBalance)

	if err == sql.ErrNoRows {
		return "", 0, fmt.Errorf("receiver not found")
	}
	if err != nil {
		return "", 0, fmt.Errorf("failed to lock receiver wallet: %w", err)
	}

	// Generate transaction ID
	txnID := uuid.New().String()

	// Create transaction record
	_, err = tx.Exec(`
		INSERT INTO transactions (id, sender_id, receiver_id, amount, status, description, idempotency_key, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, txnID, req.SenderID, req.ReceiverID, req.Amount, "completed", req.Description, req.IdempotencyKey, time.Now())

	if err != nil {
		return "", 0, fmt.Errorf("failed to create transaction: %w", err)
	}

	// Deduct from sender
	_, err = tx.Exec(`
		UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $2
	`, req.Amount, req.SenderID)

	if err != nil {
		return "", 0, fmt.Errorf("failed to deduct from sender: %w", err)
	}

	// Add to receiver
	_, err = tx.Exec(`
		UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
		WHERE user_id = $2
	`, req.Amount, req.ReceiverID)

	if err != nil {
		return "", 0, fmt.Errorf("failed to credit receiver: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return "", 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	newSenderBalance := senderBalance - req.Amount
	return txnID, newSenderBalance, nil
}

func checkIdempotencyKey(ctx context.Context, key string) (string, error) {
	// Check in database
	var txnID sql.NullString
	err := db.QueryRowContext(ctx, `
		SELECT transaction_id FROM idempotency_keys WHERE key = $1 AND expires_at > NOW()
	`, key).Scan(&txnID)

	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}

	if txnID.Valid {
		return txnID.String, nil
	}
	return "", nil
}

func storeIdempotencyKey(ctx context.Context, key string, txnID string) error {
	expiresAt := time.Now().Add(24 * time.Hour)
	_, err := db.ExecContext(ctx, `
		INSERT INTO idempotency_keys (key, transaction_id, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (key) DO NOTHING
	`, key, txnID, expiresAt)
	return err
}

func invalidateWalletCache(ctx context.Context, userID int) {
	cacheKey := fmt.Sprintf("wallet:balance:%d", userID)
	rdb.Del(ctx, cacheKey)
}

type Transaction struct {
	ID          string    `json:"id"`
	SenderID    int       `json:"sender_id"`
	ReceiverID  int       `json:"receiver_id"`
	Amount      float64   `json:"amount"`
	Status      string    `json:"status"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func getTransaction(c *gin.Context) {
	txnID := c.Param("id")

	txn, err := getTransactionByID(txnID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, ErrorResponse{
			Error:   "NOT_FOUND",
			Code:    "404",
			Message: "Transaction not found",
		})
		return
	}
	if err != nil {
		logger.WithError(err).Error("Failed to get transaction")
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "INTERNAL_ERROR",
			Code:    "500",
			Message: "Failed to retrieve transaction",
		})
		return
	}

	c.JSON(http.StatusOK, txn)
}

func getTransactionByID(txnID string) (*Transaction, error) {
	var txn Transaction
	err := db.QueryRow(`
		SELECT id, sender_id, receiver_id, amount, status, COALESCE(description, ''), created_at
		FROM transactions WHERE id = $1
	`, txnID).Scan(&txn.ID, &txn.SenderID, &txn.ReceiverID, &txn.Amount, &txn.Status, &txn.Description, &txn.CreatedAt)

	if err != nil {
		return nil, err
	}
	return &txn, nil
}
