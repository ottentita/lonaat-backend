# Production Build & Deployment Checklist

## Pre-Build Verification

### Frontend
- [ ] Update `VITE_API_URL` in `.env.production`
- [ ] Review `.env.production` variables
- [ ] Ensure no debug statements remain
- [ ] Verify error boundary component is integrated
- [ ] Check logging middleware is attached to window
- [ ] Confirm environment validation runs at startup

### Backend
- [ ] Update `.env.production` with all required secrets
- [ ] Ensure `NODE_ENV=production` so startup validations and CSRF protection are enabled
- [ ] Set `FRONTEND_URL` to the canonical client origin (used for CORS)
- [ ] Run tests: `npm run test`
- [ ] Check TypeScript compilation: `npm run build`
- [ ] Verify database migrations: `npx prisma migrate status`
- [ ] Test health endpoint locally

### Infrastructure
- [ ] Render database is provisioned (PostgreSQL)
- [ ] Redis instance is ready (if using cache)
- [ ] Domain DNS records are configured
- [ ] SSL certificate validation passed
- [ ] Backup strategy is in place

## Build Commands

### Frontend
```bash
cd frontend
npm install
npm run build
```

### Backend
```bash
cd backend-node
npm install
npm run build
npx prisma migrate deploy  # On deploy server only
```

### Docker
```bash
docker build -f backend-node/Dockerfile.prod -t lonaat-api:latest .
docker build -f frontend/Dockerfile.prod -t lonaat-frontend:latest .
docker-compose -f docker-compose.prod.yml build
```

## Build Optimization Stats

### Expected Frontend Bundle Size
- ES5 + Tree-shaken: ~250-350 KB (before gzip)
- After gzip: ~70-100 KB
- JavaScript chunks:
  - vendor-react: ~180 KB
  - vendor-charts: ~100 KB
  - vendor-ui: ~50 KB
  - main: ~100 KB

### Expected Backend Build
- Compiled size: ~2-5 MB
- With node_modules: ~500 MB-1 GB
- In Docker: ~800 MB-1.2 GB

## Testing Checklist

### Frontend Tests
```bash
cd frontend

# Build test
npm run build

# Bundle analysis (optional)
# npm install --save-dev vite-plugin-analyze
# npm run analyze

# Lighthouse score (manual)
# Build and open dist/index.html in Chrome DevTools

# Test key routes
# - /login (anonymous)
# - /dashboard (authenticated)
# - /admin (admin-only)
# - /dashboard/wallet
# - /dashboard/transactions
# - /dashboard/offers-leads
```

### Backend Tests
```bash
cd backend-node

# Type check
npm run typecheck

# Build test
npm run build

# Linting
npm run lint

# Database test
npm run migrate:test

# API health check
npm start &
curl http://localhost:4000/health
```

### Integration Tests

#### Local Docker Test
```bash
# Build and run full stack
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Test API
curl http://localhost:4000/health
curl http://localhost:4000/api/auth/me  # Should fail with 401

# View logs
docker-compose -f docker-compose.prod.yml logs backend

# Cleanup
docker-compose -f docker-compose.prod.yml down -v
```

#### Render Staging Test
```bash
# Deploy to staging branch
git push origin staging

# Monitor logs in Render dashboard
# Verify:
# - Build completes (no errors)
# - Migrations run successfully
# - Services start (health checks pass)
# - API responds to requests
```

## Performance Targets

### Frontend
- First Contentful Paint (FCP): < 2s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.5s
- Bundle size: < 100 KB (gzipped)

### Backend
- API response time: < 200ms
- Database query time: < 100ms
- Health check: < 500ms
- Error rate: < 0.5%
- Uptime: 99.9%

## Deployment Flow

### Step 1: Build Verification
```bash
# Frontend
npm run build --prefix frontend

# Backend
npm run build --prefix backend-node
npm run typecheck --prefix backend-node
```

### Step 2: Push to Repository
```bash
git add .
git commit -m "chore: production build [skip ci]"
git push origin main
```

### Step 3: Render Auto-Deploy
- Render webhook triggered
- Pulls latest code from main
- Runs build commands
- Runs migrations
- Restarts services
- Health checks pass

### Step 4: Verification
```bash
# Check API health
curl https://api.lonaat.com/health

# Check frontend loads
curl https://lonaat.com

# Monitor logs
# Render Dashboard → Logs → View logs

# Test through UI
# Login at https://lonaat.com
# Navigate through dashboard
# Check browser console for errors
```

### Step 5: Post-Deployment
- [ ] Verify all health checks pass
- [ ] Test critical user flows
- [ ] Check error tracking (Sentry)
- [ ] Monitor analytics
- [ ] Check database connection
- [ ] Verify file uploads work
- [ ] Test API endpoints
- [ ] Check SSL certificate
- [ ] Monitor error rate

## Rollback Procedure

If deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Monitor Render redeploy
# Check logs for errors
# Verify services recover
```

## Environment Variables Reference

### Frontend (.env.production)
```
VITE_API_URL=https://api.yourdomain.com
VITE_LOG_LEVEL=warn
VITE_ENABLE_ERROR_TRACKING=true
VITE_SENTRY_DSN=https://your-key@sentry.io/project
VITE_ANALYTICS_ID=GA-XXXXXX
```

### Backend (.env.production)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=your-secure-random-secret
FRONTEND_URL=https://yourfrontend.example.com     # required for CORS
REDIS_URL=redis://...
LOG_LEVEL=warn
SENTRY_DSN=https://your-key@sentry.io/project
```

## Monitoring After Deploy

### Error Tracking
- Configure Sentry dashboard
- Set up Slack notifications
- Monitor error rates and trends

### Performance Monitoring
- Use Render metrics dashboard
- Monitor API response times
- Track database connection pool
- Watch disk usage

### Logs
- View in Render dashboard
- Search for ERROR and WARN
- Check for slow queries
- Monitor authentication failures

### Alerts
- Set up CPU usage alerts
- Configure memory alerts
- Add response time alerts
- Set error rate thresholds

## Cost Monitoring

- Expected cost: $30-60/month base
- Database: $15-30/month
- Storage: $5-10/month
- Optional services (CDN, email): +$10-20/month

Review usage weekly and adjust resources as needed.

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor API response times
- [ ] Verify backups

### Weekly
- [ ] Review analytics
- [ ] Check database performance
- [ ] Update dependencies (security)

### Monthly
- [ ] Review costs
- [ ] Analyze usage patterns
- [ ] Plan capacity upgrades
- [ ] Security audit

### Quarterly
- [ ] Major dependency updates
- [ ] Performance optimization
- [ ] Architecture review
- [ ] Disaster recovery test

## Success Criteria

✅ Build completes without errors
✅ All migrations run successfully
✅ Health checks pass
✅ API responds to requests
✅ Frontend loads without console errors
✅ Authentication works end-to-end
✅ Key user flows function correctly
✅ No P0 errors in Sentry
✅ Database connections are stable
✅ File uploads work correctly
