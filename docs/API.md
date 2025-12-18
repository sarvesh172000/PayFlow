# API Reference

## Base URL

```
Development: http://localhost:3001/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_access_token>
```

## Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| General API | 100 requests / 15 minutes |
| Authentication | 5 requests / 15 minutes |
| Transfers | 10 requests / minute |

## Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "code": "400"
}
```

## Common Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (valid token but insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Authentication Endpoints

### Register New User

**POST** `/auth/register`

Creates a new user account with an initial balance of $1,000.

**Request Body:**
```json
{
  "email": "string (required, valid email)",
  "password": "string (required, min 8 characters)",
  "full_name": "string (required)",
  "phone": "string (optional, valid phone format)"
}
```

**Success Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2026-01-22T10:00:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**
- `400` - Validation error or user already exists

---

### Login

**POST** `/auth/login`

Authenticates a user and returns JWT tokens.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "full_name": "John Doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - Account disabled

---

### Refresh Token

**POST** `/auth/refresh`

Generates a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**
- `401` - Invalid or expired refresh token

---

### Logout

**POST** `/auth/logout`

Revokes the refresh token.

**Request Body:**
```json
{
  "refreshToken": "string (required)"
}
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Wallet Endpoints

### Get Balance

**GET** `/wallet/balance`

Retrieves the current wallet balance (cached for 5 minutes).

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "balance": 1234.56,
  "currency": "USD",
  "cached": false
}
```

---

### Transfer Money

**POST** `/wallet/transfer`

Sends money to another user. Rate-limited to 10 requests per minute.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "receiver_email": "string (required, valid email)",
  "amount": "number (required, > 0)",
  "description": "string (optional)"
}
```

**Success Response (200):**
```json
{
  "message": "Transfer completed successfully",
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 50.00,
    "status": "completed",
    "sender_balance": 1184.56
  }
}
```

**Error Responses:**
- `400` - Invalid request (insufficient balance, same sender/receiver)
- `404` - Receiver not found
- `429` - Rate limit exceeded
- `503` - Ledger service unavailable

---

### Add Funds

**POST** `/wallet/add-funds`

Adds funds to the wallet (for testing purposes, max $10,000).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": "number (required, 1-10000)"
}
```

**Success Response (200):**
```json
{
  "message": "Funds added successfully",
  "new_balance": 1734.56
}
```

---

## Transaction Endpoints

### Get Transaction History

**GET** `/transactions/history`

Retrieves paginated transaction history with optional filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)
- `type` - Filter by 'sent' or 'received' (optional)

**Success Response (200):**
```json
{
  "transactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "sent",
      "amount": 50.00,
      "currency": "USD",
      "status": "completed",
      "description": "Lunch payment",
      "created_at": "2026-01-22T10:30:00.000Z",
      "counterparty": {
        "email": "recipient@example.com",
        "name": "Jane Smith"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

---

### Get Transaction Details

**GET** `/transactions/:transactionId`

Retrieves details of a specific transaction.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sender": {
    "id": 123,
    "email": "sender@example.com",
    "name": "John Doe"
  },
  "receiver": {
    "id": 456,
    "email": "receiver@example.com",
    "name": "Jane Smith"
  },
  "amount": 50.00,
  "currency": "USD",
  "status": "completed",
  "description": "Lunch payment",
  "created_at": "2026-01-22T10:30:00.000Z",
  "completed_at": "2026-01-22T10:30:01.000Z"
}
```

**Error Responses:**
- `404` - Transaction not found or no access

---

### Get Transaction Statistics

**GET** `/transactions/stats/summary`

Retrieves aggregate statistics for the current user.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "sent": {
    "count": 15,
    "total_amount": 750.00
  },
  "received": {
    "count": 10,
    "total_amount": 500.00
  }
}
```

---

## User Endpoints

### Get Profile

**GET** `/user/profile`

Retrieves the current user's profile and wallet information.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "id": 123,
  "email": "user@example.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "created_at": "2026-01-15T08:00:00.000Z",
  "wallet": {
    "balance": 1234.56,
    "currency": "USD"
  }
}
```

---

### Search Users

**GET** `/user/search`

Searches for users by email (for selecting transfer recipients).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `email` - Email search query (min 3 characters, required)

**Success Response (200):**
```json
{
  "users": [
    {
      "id": 456,
      "email": "jane.smith@example.com",
      "full_name": "Jane Smith"
    }
  ]
}
```

**Error Responses:**
- `400` - Invalid query (too short)

---

## Ledger Service Endpoints

These endpoints are called internally by the API Gateway. Direct access is possible for debugging.

### Process Transfer

**POST** `http://localhost:8080/transfer`

Processes a money transfer with ACID guarantees.

**Request Body:**
```json
{
  "sender_id": 123,
  "receiver_id": 456,
  "amount": 50.00,
  "description": "Lunch payment",
  "idempotency_key": "unique-key-per-request"
}
```

**Success Response (200):**
```json
{
  "transaction_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "amount": 50.00,
  "sender_balance": 1184.56,
  "message": "Transfer completed successfully"
}
```

---

### Get Transaction

**GET** `http://localhost:8080/transaction/:id`

Retrieves a transaction by ID.

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sender_id": 123,
  "receiver_id": 456,
  "amount": 50.00,
  "status": "completed",
  "description": "Lunch payment",
  "created_at": "2026-01-22T10:30:00.000Z"
}
```

---

### Health Check

**GET** `http://localhost:8080/health`

Checks the health of the ledger service.

**Success Response (200):**
```json
{
  "status": "healthy",
  "service": "ledger-service",
  "database": "healthy",
  "redis": "healthy",
  "time": "2026-01-22T10:30:00.000Z"
}
```
