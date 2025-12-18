# Deployment Guide

## Table of Contents
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Environment Variables](#environment-variables)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Local Development

### Prerequisites
- Docker Desktop (recommended)
- Node.js 18+
- Go 1.21+
- PostgreSQL 15+
- Redis 7+

### Quick Start with Docker

```bash
# Clone repository
git clone <your-repo-url>
cd payflow

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Manual Setup

#### 1. Database Setup

```bash
# Start PostgreSQL
docker run -d \
  --name payflow-postgres \
  -e POSTGRES_DB=payflow \
  -e POSTGRES_USER=payflow_user \
  -e POSTGRES_PASSWORD=payflow_pass \
  -p 5432:5432 \
  postgres:15-alpine

# Initialize schema
psql -h localhost -U payflow_user -d payflow -f database/schema.sql
```

#### 2. Redis Setup

```bash
docker run -d \
  --name payflow-redis \
  -p 6379:6379 \
  redis:7-alpine
```

#### 3. Ledger Service

```bash
cd ledger-service
cp .env.example .env
go mod download
go run main.go
```

#### 4. API Gateway

```bash
cd api-gateway
cp .env.example .env
npm install
npm run dev
```

#### 5. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## Docker Deployment

### Build and Run

```bash
# Build all images
docker-compose build

# Start in detached mode
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Restart a service
docker-compose restart [service-name]

# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: always
    
  ledger-service:
    build: ./ledger-service
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: always
    
  api-gateway:
    build: ./api-gateway
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      LEDGER_SERVICE_URL: http://ledger-service:8080
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    depends_on:
      - ledger-service
    restart: always
    
  frontend:
    build: ./frontend
    environment:
      REACT_APP_API_URL: ${API_URL}
    depends_on:
      - api-gateway
    restart: always
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - api-gateway
    restart: always

volumes:
  postgres-data:
  redis-data:
```

---

## Cloud Deployment

### Option 1: Render.com (Recommended for Beginners)

#### Frontend (Static Site)
1. Connect GitHub repository
2. Select `frontend` directory
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Add environment variable: `VITE_API_URL=https://your-api.onrender.com/api`

#### API Gateway (Web Service)
1. Connect GitHub repository
2. Select `api-gateway` directory
3. Build command: `npm install`
4. Start command: `node src/server.js`
5. Add environment variables (see below)

#### Ledger Service (Web Service)
1. Connect GitHub repository
2. Select `ledger-service` directory
3. Build command: `go build`
4. Start command: `./ledger-service`
5. Add environment variables (see below)

#### Database (PostgreSQL)
1. Create PostgreSQL database
2. Copy connection string
3. Run schema: `psql <connection-string> -f database/schema.sql`

#### Redis
1. Create Redis instance
2. Copy connection URL

---

### Option 2: AWS Deployment

#### Architecture
```
CloudFront (CDN)
    │
    ├─> S3 (Frontend)
    │
    └─> ALB (Load Balancer)
         ├─> ECS/Fargate (API Gateway)
         ├─> ECS/Fargate (Ledger Service)
         ├─> RDS PostgreSQL
         └─> ElastiCache Redis
```

#### Steps

1. **Frontend on S3 + CloudFront**
```bash
# Build frontend
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Create CloudFront distribution
aws cloudfront create-distribution --origin-domain-name your-bucket.s3.amazonaws.com
```

2. **Backend on ECS/Fargate**
```bash
# Build and push Docker images
docker build -t payflow-api ./api-gateway
docker tag payflow-api:latest <ecr-repo>:latest
docker push <ecr-repo>:latest

# Create ECS task definition and service
aws ecs create-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster payflow --service-name api-gateway --task-definition payflow-api
```

3. **Database (RDS)**
- Create RDS PostgreSQL instance
- Configure security groups
- Run schema migration

4. **Redis (ElastiCache)**
- Create ElastiCache Redis cluster
- Configure security groups

---

### Option 3: DigitalOcean App Platform

1. **Create New App**
2. **Connect GitHub repository**
3. **Configure Components:**
   - Frontend: Static Site (auto-detected)
   - API Gateway: Web Service (Node.js)
   - Ledger Service: Web Service (Go)
4. **Add Resources:**
   - PostgreSQL database
   - Redis database
5. **Set Environment Variables**
6. **Deploy**

---

## Environment Variables

### API Gateway (.env)

```bash
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://host:6379

# JWT Secrets (MUST CHANGE IN PRODUCTION)
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>

# Services
LEDGER_SERVICE_URL=http://ledger-service:8080

# CORS
FRONTEND_URL=https://your-frontend.com

# Logging
LOG_LEVEL=info
```

### Ledger Service (.env)

```bash
DATABASE_URL=postgres://user:pass@host:5432/dbname
REDIS_URL=host:6379
PORT=8080
```

### Frontend (.env)

```bash
VITE_API_URL=https://your-api-domain.com/api
```

### Generate Secrets

```bash
# Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 64
```

---

## Nginx Configuration (Production)

Create `nginx.conf`:

```nginx
upstream api {
    server api-gateway:3001;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # API
    location /api {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

## SSL/TLS Certificate

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal (cron)
0 0 * * * certbot renew --quiet
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check API Gateway
curl http://localhost:3001/health

# Check Ledger Service
curl http://localhost:8080/health

# Check Database
docker exec payflow-postgres pg_isready

# Check Redis
docker exec payflow-redis redis-cli ping
```

### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 api-gateway
```

### Database Backup

```bash
# Backup
docker exec payflow-postgres pg_dump -U payflow_user payflow > backup.sql

# Restore
docker exec -i payflow-postgres psql -U payflow_user payflow < backup.sql
```

### Monitoring Tools

- **Logs**: Winston (Node.js), Logrus (Go)
- **APM**: New Relic, Datadog
- **Errors**: Sentry
- **Uptime**: UptimeRobot, Pingdom
- **Metrics**: Prometheus + Grafana

---

## Scaling Strategies

### Horizontal Scaling

```yaml
# docker-compose.yml
api-gateway:
  deploy:
    replicas: 3
    
ledger-service:
  deploy:
    replicas: 2
```

### Database Optimization

- Enable connection pooling
- Add read replicas
- Use database indexes
- Implement query caching

### Redis Optimization

- Enable persistence (AOF)
- Use Redis Cluster for high availability
- Implement proper cache invalidation

---

## Troubleshooting

### Common Issues

**Database connection failed**
- Check DATABASE_URL format
- Verify database is running
- Check network connectivity

**Redis connection timeout**
- Verify Redis is running
- Check REDIS_URL format
- Check firewall rules

**Frontend can't reach API**
- Verify VITE_API_URL is correct
- Check CORS configuration
- Verify API is running

**Token expired errors**
- Check JWT_SECRET is consistent
- Verify token expiration times
- Clear browser localStorage

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database SSL
- [ ] Use environment variables for secrets
- [ ] Implement logging and monitoring
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Use secret management tools (AWS Secrets Manager, HashiCorp Vault)

---

## Performance Optimization

- [ ] Enable Redis caching
- [ ] Add database indexes
- [ ] Use connection pooling
- [ ] Enable gzip compression
- [ ] Implement CDN for static assets
- [ ] Optimize database queries
- [ ] Use lazy loading in frontend
- [ ] Enable HTTP/2
- [ ] Implement service worker
- [ ] Optimize Docker images (multi-stage builds)
