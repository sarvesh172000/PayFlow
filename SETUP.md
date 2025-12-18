# PayFlow - Setup Guide

## Prerequisites Check

Before you begin, ensure you have the following installed:

- ✅ **Docker Desktop** (Recommended) - [Download](https://www.docker.com/products/docker-desktop/)
- ✅ **Git** - [Download](https://git-scm.com/downloads)

OR for local development:

- ✅ **Node.js 18+** - [Download](https://nodejs.org/)
- ✅ **Go 1.21+** - [Download](https://go.dev/dl/)
- ✅ **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- ✅ **Redis 7+** - [Download](https://redis.io/download/)

---

## Quick Start (Docker - Recommended)

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd payflow
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis cache on port 6379
- Go Ledger Service on port 8080
- Node.js API Gateway on port 3001
- React Frontend on port 3000

### Step 3: Verify Everything is Running

```bash
# Check status
docker-compose ps

# Should see all services as "Up"
```

### Step 4: Access the Application

Open your browser and go to: **http://localhost:3000**

### Step 5: Login with Demo Account

Use one of these demo accounts:
- Email: `alice@payflow.com` | Password: `demo1234`
- Email: `bob@payflow.com` | Password: `demo1234`
- Email: `charlie@payflow.com` | Password: `demo1234`

---

## Manual Setup (Without Docker)

### Step 1: Setup PostgreSQL

```bash
# Start PostgreSQL (if installed locally)
# macOS with Homebrew:
brew services start postgresql@15

# Create database
createdb payflow

# Initialize schema
psql payflow < database/schema.sql
```

Or use Docker for just the database:

```bash
docker run -d \
  --name payflow-postgres \
  -e POSTGRES_DB=payflow \
  -e POSTGRES_USER=payflow_user \
  -e POSTGRES_PASSWORD=payflow_pass \
  -p 5432:5432 \
  postgres:15-alpine

# Wait 10 seconds for it to start, then:
psql -h localhost -U payflow_user -d payflow -f database/schema.sql
```

### Step 2: Setup Redis

```bash
# Start Redis (if installed locally)
# macOS with Homebrew:
brew services start redis

# Or use Docker:
docker run -d \
  --name payflow-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Step 3: Start Go Ledger Service

```bash
cd ledger-service

# Copy environment file
cp .env.example .env

# Install dependencies
go mod download

# Run the service
go run main.go
```

You should see: `Ledger service starting on port 8080`

### Step 4: Start Node.js API Gateway

Open a **new terminal window**:

```bash
cd api-gateway

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Run the service
npm run dev
```

You should see: `🚀 API Gateway running on port 3001`

### Step 5: Start React Frontend

Open **another new terminal window**:

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Run the development server
npm run dev
```

You should see: `Local: http://localhost:3000`

### Step 6: Access the Application

Open your browser and go to: **http://localhost:3000**

---

## Testing the System

### 1. Register a New Account

- Click "Get Started" or "Sign Up"
- Fill in your details
- You'll receive $1,000 starting balance!

### 2. Or Login with Demo Account

- Email: `alice@payflow.com`
- Password: `demo1234`

### 3. Send Money

- Go to "Transfer" page
- Enter recipient email: `bob@payflow.com`
- Enter amount: `50`
- Click "Send"
- ✅ Transfer completed!

### 4. View Transaction History

- Go to "History" page
- See all your transactions
- Filter by sent/received

### 5. Check Profile

- Go to "Profile" page
- View your account details
- See wallet information

---

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Check what's using the port
lsof -i :3000  # or :3001, :8080, :5432, :6379

# Kill the process
kill -9 <PID>
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Or for local install:
pg_isready

# Check connection string in .env files
DATABASE_URL=postgres://payflow_user:payflow_pass@localhost:5432/payflow
```

### Redis Connection Failed

```bash
# Check Redis is running
docker ps | grep redis

# Or for local install:
redis-cli ping
# Should respond with: PONG
```

### Frontend Can't Reach API

Check the `.env` file in frontend folder:
```bash
VITE_API_URL=http://localhost:3001/api
```

### Clear Everything and Start Fresh

```bash
# Stop all Docker containers
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild and restart
docker-compose up -d --build
```

---

## Environment Variables

### API Gateway (.env)

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://payflow_user:payflow_pass@localhost:5432/payflow
REDIS_URL=redis://localhost:6379
LEDGER_SERVICE_URL=http://localhost:8080
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=info
```

### Ledger Service (.env)

```bash
DATABASE_URL=postgres://payflow_user:payflow_pass@localhost:5432/payflow?sslmode=disable
REDIS_URL=localhost:6379
PORT=8080
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:3001/api
```

---

## Useful Commands

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api-gateway

# Restart a service
docker-compose restart api-gateway

# Rebuild a service
docker-compose up -d --build api-gateway

# Check status
docker-compose ps
```

### Database Commands

```bash
# Access PostgreSQL
docker exec -it payflow-postgres psql -U payflow_user -d payflow

# Run SQL query
docker exec payflow-postgres psql -U payflow_user -d payflow -c "SELECT * FROM users;"

# Backup database
docker exec payflow-postgres pg_dump -U payflow_user payflow > backup.sql

# Restore database
docker exec -i payflow-postgres psql -U payflow_user payflow < backup.sql
```

### Redis Commands

```bash
# Access Redis CLI
docker exec -it payflow-redis redis-cli

# Check keys
docker exec payflow-redis redis-cli KEYS '*'

# Clear all cache
docker exec payflow-redis redis-cli FLUSHALL
```

---

## Development Workflow

### Making Changes to Frontend

```bash
cd frontend
# Edit files in src/
# Changes will hot-reload automatically
```

### Making Changes to API Gateway

```bash
cd api-gateway
# Edit files in src/
# Service will auto-restart (if using nodemon)
```

### Making Changes to Ledger Service

```bash
cd ledger-service
# Edit main.go or other files
# Restart the service manually:
go run main.go
```

### Running in Production Mode

```bash
# Build frontend
cd frontend
npm run build

# Built files will be in dist/

# Run API in production
cd api-gateway
NODE_ENV=production node src/server.js
```

---

## Next Steps

1. ✅ **Explore the Application** - Try all features
2. 📚 **Read the [API Documentation](docs/API.md)** - Learn about all endpoints
3. 🚀 **Deploy to Production** - See [Deployment Guide](docs/DEPLOYMENT.md)
4. 🎨 **Customize the UI** - Make it your own
5. ⚡ **Add New Features** - Extend the functionality

---

## Need Help?

- 📖 Check the [README.md](README.md) for detailed documentation
- 🔍 Look at [API.md](docs/API.md) for API reference
- 🚀 See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment guide
- 🐛 Check logs: `docker-compose logs -f`

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` or `go mod download` |
| "Port already in use" | Change port in .env or kill the process |
| "Connection refused" | Make sure database/redis are running |
| "Invalid token" | Clear browser localStorage and login again |
| "CORS error" | Check FRONTEND_URL in API Gateway .env |

---

Enjoy using PayFlow! 🎉
