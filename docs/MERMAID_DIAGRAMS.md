# PayFlow - Architecture Diagrams

This document contains Mermaid diagrams for visualizing PayFlow's architecture on GitHub.

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend<br/>Port 3000]
    end
    
    subgraph "API Layer"
        B[Node.js API Gateway<br/>Port 3001<br/>JWT Auth | Rate Limiting]
    end
    
    subgraph "Service Layer"
        C[Go Ledger Service<br/>Port 8080<br/>ACID Transactions]
    end
    
    subgraph "Data Layer"
        D[(PostgreSQL 15<br/>Primary Database)]
        E[(Redis 7<br/>Cache & Sessions)]
        F[Logging<br/>Winston | Logrus]
    end
    
    A -->|HTTPS/REST| B
    B -->|HTTP| C
    C --> D
    C --> E
    B --> D
    B --> E
    C --> F
    B --> F
    
    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style B fill:#10b981,stroke:#059669,color:#fff
    style C fill:#f59e0b,stroke:#d97706,color:#fff
    style D fill:#3b82f6,stroke:#2563eb,color:#fff
    style E fill:#ef4444,stroke:#dc2626,color:#fff
    style F fill:#8b5cf6,stroke:#7c3aed,color:#fff
```

## Transfer Flow Sequence

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API as API Gateway
    participant Ledger as Ledger Service
    participant DB as PostgreSQL
    participant Cache as Redis
    
    User->>Frontend: Send Money ($50)
    Frontend->>API: POST /api/wallet/transfer
    
    Note over API: 1. Validate JWT Token
    Note over API: 2. Check Rate Limit
    Note over API: 3. Validate Input
    
    API->>DB: Get Receiver User ID
    DB-->>API: Receiver Found
    
    API->>Ledger: POST /transfer
    
    Note over Ledger: 4. Check Idempotency
    
    Ledger->>DB: BEGIN TRANSACTION
    Ledger->>DB: Lock Sender Wallet (FOR UPDATE)
    Ledger->>DB: Check Balance >= $50
    Ledger->>DB: Lock Receiver Wallet
    Ledger->>DB: Create Transaction Record
    Ledger->>DB: Debit Sender (-$50)
    Ledger->>DB: Credit Receiver (+$50)
    Ledger->>DB: COMMIT
    
    Note over Ledger: 5. Transaction Complete
    
    Ledger->>Cache: Invalidate Balance Cache
    Cache-->>Ledger: Cache Cleared
    
    Ledger-->>API: Success (TX ID)
    API-->>Frontend: Transfer Complete
    Frontend-->>User: ✓ Money Sent!
```

## Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API as API Gateway
    participant DB as PostgreSQL
    
    User->>Frontend: Login (email, password)
    Frontend->>API: POST /api/auth/login
    
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: User Record
    
    Note over API: bcrypt.compare(password, hash)
    
    alt Password Valid
        Note over API: Generate JWT Tokens
        API->>DB: Store Refresh Token
        API-->>Frontend: {accessToken, refreshToken}
        Frontend->>Frontend: Store in localStorage
        Frontend-->>User: ✓ Login Success
    else Password Invalid
        API-->>Frontend: 401 Unauthorized
        Frontend-->>User: ✗ Invalid credentials
    end
    
    Note over User,DB: Subsequent Requests
    
    User->>Frontend: Navigate to Dashboard
    Frontend->>API: GET /api/wallet/balance<br/>Header: Bearer {accessToken}
    
    alt Token Valid
        API->>DB: Get wallet balance
        DB-->>API: Balance: $1,000
        API-->>Frontend: {balance: 1000}
        Frontend-->>User: Display Balance
    else Token Expired
        API-->>Frontend: 401 Token Expired
        Frontend->>API: POST /api/auth/refresh<br/>{refreshToken}
        API->>DB: Validate refresh token
        API-->>Frontend: New {accessToken}
        Frontend->>API: Retry original request
    end
```

## Database Entity Relationship

```mermaid
erDiagram
    USERS ||--o| WALLETS : owns
    USERS ||--o{ TRANSACTIONS : sends
    USERS ||--o{ TRANSACTIONS : receives
    USERS ||--o{ REFRESH_TOKENS : has
    TRANSACTIONS ||--o| IDEMPOTENCY_KEYS : uses
    
    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    
    WALLETS {
        uuid id PK
        uuid user_id FK
        decimal balance
        string currency
        timestamp created_at
        timestamp updated_at
    }
    
    TRANSACTIONS {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        decimal amount
        string currency
        string status
        string description
        uuid idempotency_key UK
        jsonb metadata
        timestamp created_at
        timestamp completed_at
    }
    
    REFRESH_TOKENS {
        uuid id PK
        uuid user_id FK
        string token UK
        timestamp expires_at
        boolean revoked
        timestamp created_at
    }
    
    IDEMPOTENCY_KEYS {
        uuid key PK
        uuid transaction_id FK
        timestamp created_at
        timestamp expires_at
    }
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "External"
        Users[Users/Clients]
        CDN[CDN/CloudFront]
    end
    
    subgraph "Load Balancing"
        LB[Application Load Balancer]
    end
    
    subgraph "Application Tier - Auto Scaling Group"
        API1[API Gateway<br/>Instance 1]
        API2[API Gateway<br/>Instance 2]
        API3[API Gateway<br/>Instance 3]
        LED1[Ledger Service<br/>Instance 1]
        LED2[Ledger Service<br/>Instance 2]
    end
    
    subgraph "Data Tier"
        PG_PRIMARY[(PostgreSQL<br/>Primary)]
        PG_REPLICA[(PostgreSQL<br/>Read Replica)]
        REDIS_CLUSTER[(Redis Cluster<br/>3 Nodes)]
    end
    
    subgraph "Storage"
        S3[S3 Bucket<br/>Static Assets]
    end
    
    subgraph "Monitoring"
        CW[CloudWatch<br/>Metrics & Logs]
    end
    
    Users --> CDN
    CDN --> S3
    Users --> LB
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> LED1
    API2 --> LED1
    API3 --> LED2
    API1 --> LED2
    
    API1 --> PG_PRIMARY
    API2 --> PG_PRIMARY
    API3 --> PG_REPLICA
    
    LED1 --> PG_PRIMARY
    LED2 --> PG_PRIMARY
    
    API1 --> REDIS_CLUSTER
    API2 --> REDIS_CLUSTER
    API3 --> REDIS_CLUSTER
    LED1 --> REDIS_CLUSTER
    LED2 --> REDIS_CLUSTER
    
    API1 --> CW
    API2 --> CW
    API3 --> CW
    LED1 --> CW
    LED2 --> CW
    
    style Users fill:#6366f1,stroke:#4f46e5,color:#fff
    style CDN fill:#10b981,stroke:#059669,color:#fff
    style LB fill:#f59e0b,stroke:#d97706,color:#fff
    style API1 fill:#3b82f6,stroke:#2563eb,color:#fff
    style API2 fill:#3b82f6,stroke:#2563eb,color:#fff
    style API3 fill:#3b82f6,stroke:#2563eb,color:#fff
    style LED1 fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style LED2 fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style PG_PRIMARY fill:#ef4444,stroke:#dc2626,color:#fff
    style PG_REPLICA fill:#ef4444,stroke:#dc2626,color:#fff
    style REDIS_CLUSTER fill:#f97316,stroke:#ea580c,color:#fff
```

## Error Handling Flow

```mermaid
graph TD
    A[Request Received] --> B{JWT Valid?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Rate Limit OK?}
    D -->|No| E[429 Too Many Requests]
    D -->|Yes| F{Input Valid?}
    F -->|No| G[400 Bad Request]
    F -->|Yes| H{Balance Sufficient?}
    H -->|No| I[422 Insufficient Funds]
    H -->|Yes| J[Process Transaction]
    
    J --> K{Transaction Success?}
    K -->|Yes| L[200 Success]
    K -->|No| M{Error Type?}
    
    M -->|DB Error| N[Log Error + Retry]
    M -->|Network Error| O[503 Service Unavailable]
    M -->|Duplicate| P[409 Conflict - Already Processed]
    
    N --> Q{Retry Success?}
    Q -->|Yes| L
    Q -->|No| R[500 Internal Error]
    
    style L fill:#10b981,stroke:#059669,color:#fff
    style C fill:#ef4444,stroke:#dc2626,color:#fff
    style E fill:#f59e0b,stroke:#d97706,color:#fff
    style G fill:#ef4444,stroke:#dc2626,color:#fff
    style I fill:#f97316,stroke:#ea580c,color:#fff
    style O fill:#ef4444,stroke:#dc2626,color:#fff
    style P fill:#f59e0b,stroke:#d97706,color:#fff
    style R fill:#ef4444,stroke:#dc2626,color:#fff
```

## Caching Strategy

```mermaid
graph LR
    A[Request Balance] --> B{Check Redis}
    B -->|Cache Hit| C[Return Cached Balance]
    B -->|Cache Miss| D[Query PostgreSQL]
    D --> E[Store in Redis<br/>TTL: 5 min]
    E --> F[Return Balance]
    
    G[Transfer Complete] --> H[Invalidate Cache]
    H --> I[Delete Redis Keys:<br/>sender + receiver]
    
    style C fill:#10b981,stroke:#059669,color:#fff
    style D fill:#3b82f6,stroke:#2563eb,color:#fff
    style E fill:#ef4444,stroke:#dc2626,color:#fff
    style F fill:#10b981,stroke:#059669,color:#fff
    style I fill:#f59e0b,stroke:#d97706,color:#fff
```

## State Management (Frontend)

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    Unauthenticated --> Authenticating: Login/Register
    Authenticating --> Authenticated: Success
    Authenticating --> Unauthenticated: Failure
    
    Authenticated --> Dashboard: Navigate
    Dashboard --> Transfer: Send Money
    Dashboard --> History: View Transactions
    Dashboard --> Profile: Edit Profile
    
    Transfer --> Dashboard: Complete
    History --> Dashboard: Back
    Profile --> Dashboard: Back
    
    Authenticated --> TokenRefresh: Token Expired
    TokenRefresh --> Authenticated: New Token
    TokenRefresh --> Unauthenticated: Refresh Failed
    
    Authenticated --> Unauthenticated: Logout
```

## CI/CD Pipeline

```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    
    B --> C[Run Tests]
    C --> D{Tests Pass?}
    D -->|No| E[Notify Developer]
    D -->|Yes| F[Build Docker Images]
    
    F --> G[Push to Registry]
    G --> H{Branch?}
    
    H -->|main| I[Deploy to Production]
    H -->|develop| J[Deploy to Staging]
    H -->|feature| K[Deploy to Dev]
    
    I --> L[Health Check]
    J --> L
    K --> L
    
    L --> M{Healthy?}
    M -->|Yes| N[Success ✓]
    M -->|No| O[Rollback]
    
    style N fill:#10b981,stroke:#059669,color:#fff
    style E fill:#ef4444,stroke:#dc2626,color:#fff
    style O fill:#f59e0b,stroke:#d97706,color:#fff
```

---

## How to View These Diagrams on GitHub

1. GitHub automatically renders Mermaid diagrams in Markdown files
2. Simply view this file on GitHub to see all diagrams
3. Diagrams are interactive and can be zoomed/panned
4. Dark mode is automatically supported

## Embedding in Other Documents

To embed these diagrams in your README or other docs, simply copy the Mermaid code blocks:

````markdown
```mermaid
graph TB
    A[Your Diagram]
```
````

GitHub will render them automatically! 🎉
