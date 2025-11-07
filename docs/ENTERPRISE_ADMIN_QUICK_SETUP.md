# Enterprise Admin Quick Setup Guide

## 🚀 Quick Start

This guide helps you get the Enterprise Admin Dashboard running in under 30 minutes.

### Prerequisites Checklist

- [ ] Server with Ubuntu 20.04+ or CentOS 8+
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ or MySQL 8.0+
- [ ] Redis 6.0+
- [ ] Domain name (e.g., admin.yourdomain.com)
- [ ] SSL certificate (Let's Encrypt recommended)

---

## ⚡ 15-Minute Setup

### Step 1: Server Preparation (5 minutes)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install Nginx
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Database Setup (3 minutes)

```bash
# For PostgreSQL
sudo -u postgres psql
CREATE DATABASE ulasis_enterprise;
CREATE USER ulasis_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ulasis_enterprise TO ulasis_admin;
\q

# For MySQL (alternative)
mysql -u root -p
CREATE DATABASE ulasis_enterprise;
CREATE USER 'ulasis_admin'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ulasis_enterprise.* TO 'ulasis_admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Application Setup (5 minutes)

```bash
# Clone and setup application
cd /var/www
sudo git clone <your-repo-url> ulasis
cd ulasis/Backend

# Install dependencies
npm ci --production

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Run database migrations
npm run migrate

# Create first admin user
node scripts/createFirstAdmin.js
```

**Essential .env Settings:**
```env
NODE_ENV=production
APP_URL=https://admin.yourdomain.com
DB_HOST=localhost
DB_NAME=ulasis_enterprise
DB_USER=ulasis_admin
DB_PASSWORD=your_secure_password
JWT_SECRET=your_32_character_minimum_secret
REDIS_HOST=localhost
```

### Step 4: Frontend Build (2 minutes)

```bash
cd ../Frontend
npm ci
npm run build
```

---

## 🔧 SSL & Domain Setup

### Step 5: SSL Certificate (5 minutes)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d admin.yourdomain.com

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Step 6: Nginx Configuration (3 minutes)

Create `/etc/nginx/sites-available/ulasis-admin`:

```nginx
server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.yourdomain.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/ulasis/Frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name admin.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/ulasis-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 Launch Application

### Step 7: Start Services (2 minutes)

```bash
cd /var/www/ulasis/Backend

# Start with PM2
pm2 start src/app.js --name "ulasis-admin"
pm2 save
pm2 startup

# Check status
pm2 status
```

### Step 8: Verify Setup (2 minutes)

1. **Open Browser**: Navigate to `https://admin.yourdomain.com`
2. **Login**: Use credentials created in Step 3
3. **Verify Dashboard**: Should show overview with metrics
4. **Test Features**: Try user management, analytics, etc.

---

## ✅ Post-Setup Checklist

### Security Setup (5 minutes)

```bash
# Configure firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Set up log rotation
sudo nano /etc/logrotate.d/ulasis-admin
```

**Log rotation config:**
```
/var/www/ulasis/Backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ulasis ulasis
    postrotate
        pm2 reload ulasis-admin
    endscript
}
```

### Monitoring Setup (3 minutes)

```bash
# Install monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Set up health check
crontab -e
# Add: */5 * * * * curl -f https://admin.yourdomain.com/health || echo "Health check failed" | mail -s "Ulasis Admin Down" admin@yourdomain.com
```

---

## 🔍 Troubleshooting Quick Fixes

### Common Issues & Solutions

**Port 3001 already in use:**
```bash
sudo lsof -ti:3001 | xargs kill -9
pm2 restart ulasis-admin
```

**Database connection failed:**
```bash
# Check database status
sudo systemctl status postgresql  # or mysql

# Test connection
psql -h localhost -U ulasis_admin -d ulasis_enterprise
```

**Nginx configuration error:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

**SSL certificate issues:**
```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

### Quick Commands

```bash
# Check application status
pm2 status
pm2 logs ulasis-admin

# Restart application
pm2 restart ulasis-admin

# Check logs
tail -f /var/www/ulasis/Backend/logs/app.log

# Database backup
npm run backup:create

# Update application
cd /var/www/ulasis
git pull
cd Backend && npm ci
pm2 restart ulasis-admin
```

---

## 📊 Performance Optimization

### Basic Optimizations (5 minutes)

```bash
# Enable Redis caching
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Optimize Nginx
sudo nano /etc/nginx/nginx.conf
# Add inside http block:
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## 🛡️ Security Hardening

### Essential Security Steps (5 minutes)

```bash
# Create dedicated user
sudo adduser ulasis
sudo chown -R ulasis:ulasis /var/www/ulasis

# Set up fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure automatic updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Security Headers

Add to Nginx config:
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

---

## 📱 Mobile Access

### PWA Setup (Optional)

```bash
# Install service worker
cd /var/www/ulasis/Frontend
npm run build:pwa

# Configure Nginx for PWA
# Add to location block:
location /sw.js {
    add_header Cache-Control "no-cache";
}
```

---

## 🔄 Backup Strategy

### Automated Backups (3 minutes)

```bash
# Create backup script
sudo nano /usr/local/bin/ulasis-backup.sh
```

**Backup script content:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ulasis"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U ulasis_admin ulasis_enterprise > $BACKUP_DIR/db_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/ulasis

# Remove old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Make executable and schedule
sudo chmod +x /usr/local/bin/ulasis-backup.sh
echo "0 2 * * * /usr/local/bin/ulasis-backup.sh" | sudo crontab -
```

---

## 📞 Support & Resources

### Quick Help Commands

```bash
# System status
pm2 status && systemctl status nginx && systemctl status postgresql

# Application health
curl -f https://admin.yourdomain.com/health

# Log monitoring
tail -f /var/www/ulasis/Backend/logs/error.log

# Performance check
pm2 monit
```

### Emergency Procedures

**Application Down:**
```bash
pm2 restart ulasis-admin
pm2 logs ulasis-admin --lines 50
```

**Database Issues:**
```bash
sudo systemctl restart postgresql
sudo -u postgres psql -c "SELECT pg_stat_activity;"
```

**High Memory Usage:**
```bash
pm2 restart ulasis-admin
pm2 delete ulasis-admin
pm2 start src/app.js --name "ulasis-admin" --max-memory-restart 500M
```

---

## 🎉 You're Done!

Your Enterprise Admin Dashboard should now be:
- ✅ Fully operational at `https://admin.yourdomain.com`
- ✅ Secured with SSL certificate
- ✅ Protected with authentication and 2FA
- ✅ Monitored with health checks
- ✅ Backed up automatically

### Next Steps

1. **Configure Email**: Set up SMTP for notifications
2. **Add Users**: Create additional admin accounts
3. **Customize**: Adjust settings to your needs
4. **Monitor**: Set up alerts and monitoring
5. **Train**: Document procedures for your team

### Need Help?

- **Documentation**: `/docs/ENTERPRISE_ADMIN_DASHBOARD.md`
- **API Reference**: `/docs/api`
- **Support**: admin-support@yourdomain.com
- **Emergency**: +1-555-ADMIN-HELP

---

**Setup Time**: ~30 minutes  
**Difficulty**: Intermediate  
**Requirements**: Basic Linux knowledge  

🎊 **Welcome to Ulasis Enterprise Admin!** 🎊