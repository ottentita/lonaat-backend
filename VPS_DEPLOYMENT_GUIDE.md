# VPS Deployment Guide (Ubuntu 22.04 LTS)

## Prerequisites

- Ubuntu 22.04 LTS server
- SSH access to VPS
- 2GB+ RAM, 10GB+ storage
- Domain name (optional for SSL)

## 1. Initial Server Setup

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system packages
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Redis (optional, for caching)
apt install -y redis-server

# Install Nginx (reverse proxy)
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2

# Install Certbot (SSL certificates)
apt install -y certbot python3-certbot-nginx

# Create application user
useradd -m -s /bin/bash lonaat
```

## 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE lonaat_db;
CREATE USER lonaat_user WITH PASSWORD 'your-secure-password';
ALTER ROLE lonaat_user SET client_encoding TO 'utf8';
ALTER ROLE lonaat_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE lonaat_user SET default_transaction_deferrable TO on;
ALTER ROLE lonaat_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE lonaat_db TO lonaat_user;
\q

# Exit postgres user
exit
```

## 3. Clone and Setup Application

```bash
# Switch to application user
sudo -u lonaat -s

# Clone repository
cd /home/lonaat
git clone https://github.com/yourusername/lonaat-backend.git
cd lonaat-backend

# Install backend dependencies
cd backend-node
npm install
npm run build

# Setup environment variables
cp .env.example .env.production
nano .env.production

# Fill in:
# DATABASE_URL=postgresql://lonaat_user:password@localhost:5432/lonaat_db
# JWT_SECRET=your-random-secure-secret
# NODE_ENV=production
# PORT=4000

# Run database migrations
npx prisma migrate deploy
```

## 4. Frontend Setup

```bash
# Install frontend dependencies
cd ../frontend
npm install

# Build for production
npm run build

# Output: dist/ folder ready for serving
```

## 5. Configure Nginx

```bash
# Exit lonaat user
exit

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/lonaat

# Add this configuration:
```

```nginx
# Upstream Node.js application
upstream lonaat_backend {
    server 127.0.0.1:4000;
}

# Backend API server
server {
    listen 80;
    server_name api.yourdomain.com;
    client_max_body_size 100M;

    location / {
        proxy_pass http://lonaat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }
}

# Frontend static site
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    root /home/lonaat/lonaat-backend/frontend/dist;
    index index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/lonaat /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

## 6. Setup SSL Certificates

```bash
# Install Let's Encrypt SSL for both domains
sudo certbot --nginx -d api.yourdomain.com -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (should be automatic)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verify renewal
sudo certbot renew --dry-run
```

## 7. Start Application with PM2

```bash
# Switch to lonaat user
sudo -u lonaat -s

# Navigate to backend directory
cd /home/lonaat/lonaat-backend/backend-node

# Start Node.js application with PM2
pm2 start npm --name "lonaat-api" -- start

# Save PM2 startup configuration
pm2 startup systemd -u lonaat --hp /home/lonaat
pm2 save

# Exit lonaat user
exit

# Verify PM2 is running
sudo -u lonaat pm2 list
```

## 8. Setup Monitoring & Logging

```bash
# View application logs
sudo -u lonaat pm2 logs lonaat-api

# Monitor application
sudo -u lonaat pm2 monit

# Enable PM2+ monitoring (optional)
# pm2 plus
```

## 9. Firewall Setup

```bash
# Install UFW (firewall)
sudo apt install -y ufw

# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Check rules
sudo ufw status
```

## 10. Backup Strategy

```bash
# Create backup script
sudo nano /home/lonaat/backup.sh
```

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/home/lonaat/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump lonaat_db | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Backup uploads directory
tar -czf $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz /home/lonaat/uploads/

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
```

```bash
# Make executable
sudo chmod +x /home/lonaat/backup.sh

# Add to crontab (daily at 2 AM)
sudo -u lonaat crontab -e

# Add line:
0 2 * * * /home/lonaat/backup.sh
```

## Maintenance Commands

```bash
# View application status
sudo -u lonaat pm2 status

# Restart application
sudo -u lonaat pm2 restart lonaat-api

# Stop application
sudo -u lonaat pm2 stop lonaat-api

# Check logs
sudo -u lonaat pm2 logs lonaat-api --lines 100

# Tail logs in real-time
sudo -u lonaat pm2 logs lonaat-api

# Update application
cd /home/lonaat/lonaat-backend
git pull origin main
cd backend-node
npm install
npm run build
npx prisma migrate deploy
sudo -u lonaat pm2 restart lonaat-api

# View database
sudo -u postgres psql -d lonaat_db
```

## Troubleshooting

### Application won't start
```bash
sudo -u lonaat pm2 logs lonaat-api
# Check for error messages and environment variables
```

### Database connection error
```bash
# Verify connection string
sudo -u lonaat cat /home/lonaat/lonaat-backend/backend-node/.env.production

# Test connection
sudo -u postgres psql -h localhost -U lonaat_user -d lonaat_db
```

### Nginx proxy errors
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Performance Monitoring

```bash
# CPU and Memory usage
top

# Disk usage
df -h

# Check process details
ps aux | grep node

# Network connections
netstat -tlnp | grep node
```

## Security Best Practices

1. ✅ Disable root SSH login
2. ✅ Use SSH key authentication only
3. ✅ Configure firewall rules
4. ✅ Install fail2ban for brute-force protection
5. ✅ Enable SSL/TLS certificates
6. ✅ Keep database credentials in .env (not committed)
7. ✅ Regular backups of database and files
8. ✅ Monitor logs for suspicious activity

## Cost Estimation (Monthly)

- VPS (2GB RAM, 2 vCPU): $5-15
- PostgreSQL (if managed): $15-30
- Domain name: $10-15
- SSL certificate: Free (Let's Encrypt)
- **Total: ~$30-60/month**

## Next Steps

1. Test application at your domain
2. Monitor logs and performance
3. Set up automated backups
4. Configure error tracking (Sentry)
5. Enable analytics
6. Plan capacity for growth
