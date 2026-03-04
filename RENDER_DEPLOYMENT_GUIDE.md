# Render Deployment Checklist & Configuration

## Pre-Deployment Checklist

### Backend Setup
- [ ] Environment variables set in Render dashboard:
  - `NODE_ENV=production`
  - `DATABASE_URL` (PostgreSQL connection string)
  - `JWT_SECRET` (generate secure random string)
  - `REDIS_URL` (if using caching)
  - All API service credentials (Admitad, Awin, etc.)

### Frontend Setup
- [ ] Environment variables configured:
  - `VITE_API_URL` = Backend Render URL (e.g., https://lonaat-api.onrender.com)
  - `VITE_LOG_LEVEL=warn`

### Database
- [ ] PostgreSQL instance provisioned
- [ ] Database migrations run via `npm run migrate`
- [ ] Seed data loaded if needed

### Redis Cache (Optional)
- [ ] Redis instance created in Render
- [ ] `REDIS_URL` environment variable set

## Deployment Steps

### 1. Backend Deployment
```bash
# On main branch, Render auto-deploys from render.yaml
git push origin main

# Check deployment logs in Render dashboard
# URL: https://dashboard.render.com/
```

### 2. Frontend Deployment
```bash
# Build production bundle
cd frontend
npm run build

# Upload dist/ to Render Static Site
# Or configure GitHub integration for auto-deploy
```

### 3. Verification
```bash
# Check health endpoint
curl https://lonaat-api.onrender.com/health

# Check API connectivity
curl https://lonaat-api.onrender.com/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables Reference

### Backend (Node.js)
```
# Core
NODE_ENV=production
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# Authentication
JWT_SECRET=your-secure-secret-key-min-32-chars
REFRESH_TOKEN_SECRET=another-secure-secret-key

# Cache (optional)
REDIS_URL=redis://:password@host:port

# External APIs
ADMITAD_CLIENT_ID=xxxxx
ADMITAD_CLIENT_SECRET=xxxxx
AWIN_API_TOKEN=xxxxx

# Email Service
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://xxxxx@sentry.io/project
```

### Frontend (Vite)
```
# API Connection
VITE_API_URL=https://lonaat-api.onrender.com

# Logging
VITE_LOG_LEVEL=warn
VITE_ENABLE_ERROR_TRACKING=true

# Optional
VITE_SENTRY_DSN=xxxxx
VITE_ANALYTICS_ID=GA-XXXXX
```

## Render Dashboard Configuration

### Backend Service Settings
1. **Service Name**: lonaat-api
2. **GitHub Repository**: your-repo/lonaat-backend
3. **Branch**: main
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm run start`
6. **Node Version**: 18.x or higher
7. **Environment**: Select "Node" runtime

### Frontend Service Settings (if using Render)
1. **Service Type**: Static Site
2. **GitHub Repository**: your-repo/lonaat-backend/frontend
3. **Build Command**: `npm install && npm run build`
4. **Publish Directory**: dist
5. **Node Version**: 18.x or higher

### Custom Domain
1. Go to Settings → Custom Domain
2. Add your domain (e.g., api.lonaat.com)
3. Update DNS records with Render values
4. Wait for SSL certificate (auto-provisioned)

## Monitoring & Logging

### View Logs
```
# In Render dashboard
Settings → Logs → View Build & Runtime Logs

# Or via Render API
curl https://api.render.com/v1/services/{service-id}/logs \
  -H "Authorization: Bearer YOUR_RENDER_API_KEY"
```

### Health Check
- Configure health check endpoint: `/health` (port 4000)
- Interval: 30 seconds
- Timeout: 5 seconds
- Failure threshold: 3 attempts

### Error Tracking
- Integrate Sentry for production errors
- Set `SENTRY_DSN` environment variable
- Monitor error rates and exceptions

## Database Migrations

### Run with Prisma
```bash
# In Render Build Command or SSH terminal
npx prisma migrate deploy
npx prisma db seed
```

### Direct SQL (if needed)
```bash
# SSH into instance (via Render dashboard)
psql $DATABASE_URL < migrations/001_init.sql
```

## Scaling & Performance

### Auto-scaling
- Set resource limits: 0.5 CPU, 512 MB RAM (starter)
- Auto-scale: Enabled for production

### Caching
- Enable Redis for session storage
- Use redis:// connection string

### CDN
- Render provides CDN for static assets
- Images served from /public/* cached globally

## Zero-Downtime Deployment

1. **Blue-Green Deployment**: Render handles automatically
2. **Database Migrations**: Run before code deployment
3. **Environment Variables**: Update before deployment
4. **Rollback**: Use GitHub commit history to revert

## Cost Optimization

- Use reserved instances for databases
- Auto-scale down non-production instances
- Monitor usage via Render dashboard
- Consider spot instances for non-critical services

## Support Resources

- **Render Docs**: https://docs.render.com
- **Prisma Docs**: https://www.prisma.io/docs
- **Node.js Deployment**: https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
