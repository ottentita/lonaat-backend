# Production Docker Compose Deployment Guide

## Overview
This guide explains how to deploy Lonaat using Docker and Docker Compose.

## Prerequisites
- Docker (20.10+)
- Docker Compose (2.0+)
- 4GB+ RAM
- 20GB+ storage

## Setup

### 1. Create Environment File
```bash
cp .env.example .env.production
```

Edit `.env.production` with production values:
```
POSTGRES_DB=lonaat_db
POSTGRES_USER=lonaat_user
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-random-secure-secret-key
LOG_LEVEL=info
```

### 2. Build Images
```bash
docker-compose -f docker-compose.prod.yml build
```

### 3. Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Run Database Migrations
```bash
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
docker-compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

### 5. Verify Services
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Test API
curl http://localhost:4000/health
```

## Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs

# Specific service
docker-compose -f docker-compose.prod.yml logs backend

# Follow logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Update and Redeploy
```bash
# Pull latest code
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build --no-cache

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Database Backup
```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U lonaat_user lonaat_db > backup.sql

# Restore database
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U lonaat_user -d lonaat_db
```

## Networking

### Internal Communication
- Backend → Postgres: `postgresql://lonaat_user:password@postgres:5432/lonaat_db`
- Backend → Redis: `redis://redis:6379`
- Frontend → Backend: `http://backend:4000`

### External Access
- API: `http://localhost:4000`
- Frontend: `http://localhost`

## Storage

### Volumes
- `postgres_data`: Database persistence
- `redis_data`: Cache persistence

### Backups
```bash
# Backup volumes
docker run --rm -v lonaat-postgres:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## Security

### Best Practices
1. ✅ Use strong database passwords
2. ✅ Change JWT_SECRET to random value
3. ✅ Use environment variables for secrets
4. ✅ Don't commit `.env.production`
5. ✅ Regular backups of postgres_data volume
6. ✅ Use HTTPS in production (reverse proxy)
7. ✅ Limit container resources

### Resource Limits
Add to docker-compose.prod.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Performance Tuning

### PostgreSQL Configuration
```yaml
postgres:
  environment:
    POSTGRES_INITDB_ARGS: "-c shared_buffers=256MB -c effective_cache_size=1GB"
```

### Redis Configuration
```yaml
redis:
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Node.js Scaling
Run multiple backend instances with load balancing:
```yaml
backend-1:
  # ... config ...
backend-2:
  # ... config ...
load_balancer:
  image: nginx:alpine
  # ... config to balance between backend-1 and backend-2 ...
```

## Monitoring

### Health Checks
All services have health checks configured (via `healthcheck` in compose file).

### View Container Stats
```bash
docker stats
```

### Logs Analysis
```bash
# Recent errors
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR

# API response times
docker-compose -f docker-compose.prod.yml logs backend | grep "API"
```

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Verify network
docker network ls
docker network inspect lonaat-network
```

### Database connection error
```bash
# Check postgres service
docker-compose -f docker-compose.prod.yml logs postgres

# Verify credentials in .env.production
cat .env.production | grep POSTGRES
```

### Port already in use
```bash
# Find process using port
lsof -i :4000

# Change port in docker-compose.prod.yml
```

## Scaling to Production

### Upgrade Database
```bash
# Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
# Update DATABASE_URL environment variable
```

### Upgrade Cache
```bash
# Use managed Redis (AWS ElastiCache, Upstash, etc.)
# Update REDIS_URL environment variable
```

### Use Load Balancer
```bash
# Add Nginx or HAProxy in front
# Distribute traffic to multiple backend instances
```

### Enable SSL/TLS
```bash
# Use reverse proxy with SSL termination
# Or use Let's Encrypt with Certbot in container
```

## Cost

- Self-hosted on Docker: ~$5-20/month (minimal server)
- Managed services (RDS, Elasticache): +$15-50/month
- Load balancer + CDN: +$10-30/month
