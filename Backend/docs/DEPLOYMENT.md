# Deployment Guide

This guide covers deploying the Ulasis backend API to various environments, with special focus on cPanel deployment.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [cPanel Deployment](#cpanel-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Traditional Server Deployment](#traditional-server-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [SSL Configuration](#ssl-configuration)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

- **Node.js** 18+ LTS
- **MySQL** 8.0+ or MariaDB 10.5+
- **Nginx** or **Apache** web server
- **SSL certificate** (recommended for production)
- **Domain name** (for production)

### Required Tools

- **Git** for source code management
- **SSH** access for server deployment
- **PM2** for process management (recommended)
- **cPanel** access (for cPanel deployment)

## 🌐 cPanel Deployment

### Overview

cPanel provides a user-friendly interface for deploying Node.js applications. This guide walks through deploying the Ulasis backend on a cPanel hosting account.

### Step 1: Prepare Your cPanel Account

1. **Check Node.js Support**
   - Log in to cPanel
   - Look for "Setup Node.js App" or "Node.js Selector"
   - Ensure Node.js 18+ is available

2. **Enable SSH Access** (if not already enabled)
   - Go to "SSH Access" in cPanel
   - Generate SSH keys or upload your public key
   - Note your SSH credentials

### Step 2: Database Setup

1. **Create Database**
   ```bash
   # In cPanel > MySQL Databases
   - Create new database: ulasis_production
   - Create database user: ulasis_user
   - Add user to database with all privileges
   ```

2. **Note Database Credentials**
   - Database name: username_ulasis_production
   - Database user: username_ulasis_user
   - Database password: [generated password]
   - Database host: localhost (usually)

### Step 3: Upload Application Files

1. **Upload via File Manager**
   - Go to cPanel > File Manager
   - Navigate to your home directory
   - Upload the Backend folder as a zip file
   - Extract the zip file
   - Rename the folder to `backend` (or your preferred name)

2. **Or Upload via SSH**
   ```bash
   # Connect via SSH
   ssh username@yourdomain.com

   # Navigate to home directory
   cd ~

   # Clone or upload your application
   git clone <repository-url> backend
   cd backend
   ```

### Step 4: Configure Node.js Application

1. **Open Setup Node.js App**
   - In cPanel, find "Setup Node.js App"
   - Click "Create Application"

2. **Configure Application Settings**
   ```
   Node.js version: 18.x (or latest LTS)
   Application mode: Production
   Application root: /home/username/backend
   Application URL: yourdomain.com/backend
   Application startup file: src/app.js
   ```

3. **Set Environment Variables**
   Click "Environment Variables" and add:
   ```
   NODE_ENV=production
   DB_HOST=localhost
   DB_NAME=username_ulasis_production
   DB_USER=username_ulasis_user
   DB_PASS=your_database_password
   JWT_SECRET=your_32_character_jwt_secret
   SESSION_SECRET=your_32_character_session_secret
   PORT=3000 (or assigned port)
   ```

### Step 5: Install Dependencies and Run Migrations

1. **Install Dependencies**
   ```bash
   # Via SSH
   cd ~/backend
   npm ci --production
   ```

2. **Run Database Migrations**
   ```bash
   # Via SSH
   cd ~/backend
   npm run migrate
   ```

### Step 6: Configure Web Server

#### For Apache (cPanel default)

1. **Create .htaccess file**
   ```bash
   # In ~/backend/public_html/.htaccess
   RewriteEngine On
   RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
   ```

2. **Or use cPanel Proxy**
   - In "Setup Node.js App", click "Run NPM Install"
   - The application should be accessible via the configured URL

#### For Nginx (if available)

1. **Create Nginx configuration**
   ```nginx
   location /backend/ {
       proxy_pass http://localhost:3000/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
   }
   ```

### Step 7: SSL Configuration

1. **Enable SSL Certificate**
   - In cPanel > SSL/TLS Status
   - Select your domain
   - Click "Run AutoSSL" or install custom certificate

2. **Force HTTPS**
   - In cPanel > Domains
   - Enable "Force HTTPS Redirect" for your domain

### Step 8: Test Deployment

1. **Check Application Status**
   - In "Setup Node.js App", check if application is running
   - View application logs for errors

2. **Test API Endpoints**
   ```bash
   # Test health endpoint
   curl https://yourdomain.com/backend/api/v1/health

   # Expected response
   {"status":"healthy","timestamp":"2023-...","responseTime":"...ms"}
   ```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
# Use official Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health/ping || exit 1

# Start application
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_NAME=ulasis
      - DB_USER=ulasis_user
      - DB_PASS=secure_password
      - JWT_SECRET=your_jwt_secret
      - SESSION_SECRET=your_session_secret
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=ulasis
      - MYSQL_USER=ulasis_user
      - MYSQL_PASSWORD=secure_password
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  mysql_data:
```

### Deployment Commands

```bash
# Build and start containers
docker-compose up -d

# Run database migrations
docker-compose exec backend npm run migrate

# View logs
docker-compose logs -f backend

# Stop containers
docker-compose down
```

## 🖥️ Traditional Server Deployment

### Prerequisites

- Ubuntu 20.04+ or CentOS 8+
- SSH access with sudo privileges
- Domain name pointing to server

### Step 1: Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2
```

### Step 2: Database Setup

```bash
# Secure MySQL
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p
```

```sql
CREATE DATABASE ulasis_production;
CREATE USER 'ulasis_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON ulasis_production.* TO 'ulasis_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Deploy Application

```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> backend
cd backend

# Install dependencies
sudo npm ci --production

# Set permissions
sudo chown -R $USER:$USER /var/www/backend
```

### Step 4: Configure Environment

```bash
# Create environment file
sudo nano .env
```

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_NAME=ulasis_production
DB_USER=ulasis_user
DB_PASS=secure_password
JWT_SECRET=your_32_character_jwt_secret
SESSION_SECRET=your_32_character_session_secret
```

### Step 5: Run Migrations

```bash
npm run migrate
```

### Step 6: Configure PM2

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'ulasis-backend',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Step 7: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/ulasis
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/ulasis /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔧 Environment Configuration

### Production Environment Variables

Required for production deployment:

```env
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_NAME=ulasis_production
DB_USER=ulasis_user
DB_PASS=secure_password

# Security
JWT_SECRET=your_32_character_jwt_secret
SESSION_SECRET=your_32_character_session_secret

# Email (recommended)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Rate Limiting
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=warn
LOG_FILE=logs/production.log
```

### Security Best Practices

1. **Use strong secrets** for JWT and session
2. **Enable SSL/TLS** for all communications
3. **Use environment variables** for sensitive data
4. **Regularly update dependencies**
5. **Implement rate limiting**
6. **Monitor application logs**

## 🗄️ Database Setup

### MySQL Configuration

```sql
-- Create database
CREATE DATABASE ulasis_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'ulasis_user'@'localhost' IDENTIFIED BY 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON ulasis_production.* TO 'ulasis_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
```

### Migration Commands

```bash
# Run migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback migration (if needed)
npm run migrate:undo
```

### Database Backup

```bash
# Create backup
mysqldump -u ulasis_user -p ulasis_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u ulasis_user -p ulasis_production < backup_file.sql
```

## 🔒 SSL Configuration

### Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Certificate

1. **Generate CSR**
   ```bash
   openssl req -new -newkey rsa:2048 -nodes -keyout private.key -out server.csr
   ```

2. **Submit CSR to Certificate Authority**

3. **Install Certificate**
   ```bash
   # Place certificates in /etc/ssl/certs/
   sudo cp server.crt /etc/ssl/certs/
   sudo cp private.key /etc/ssl/private/
   ```

## 📊 Monitoring and Maintenance

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart ulasis-backend

# Update application
cd /var/www/backend
git pull
npm ci --production
npm run migrate
pm2 restart ulasis-backend
```

### Log Management

```bash
# Rotate logs
sudo nano /etc/logrotate.d/ulasis
```

```
/var/www/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Checks

```bash
# Add to crontab for health monitoring
*/5 * * * * curl -f http://localhost:3000/api/v1/health/ping || echo "Health check failed" | mail -s "Ulasis Health Alert" admin@yourdomain.com
```

## 🔍 Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs ulasis-backend --err

# Check environment variables
pm2 env 0
```

#### Database Connection Failed

```bash
# Test database connection
mysql -u ulasis_user -p -h localhost ulasis_production

# Check MySQL status
sudo systemctl status mysql

# View MySQL logs
sudo tail -f /var/log/mysql/error.log
```

#### Nginx 502 Bad Gateway

```bash
# Test backend directly
curl http://localhost:3000/api/v1/health

# Check Nginx configuration
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Optimization

1. **Enable Gzip Compression**
2. **Configure Database Indexes**
3. **Use Redis for Caching**
4. **Enable CDN for Static Assets**
5. **Monitor Memory Usage**

### Security Hardening

1. **Configure Firewall**
2. **Disable Unused Services**
3. **Regular Security Updates**
4. **Intrusion Detection**
5. **Regular Backups**

## 📚 Additional Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Configuration](https://www.nginx.com/resources/wiki/)
- [MySQL Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

---

For support, see the [troubleshooting guide](./TROUBLESHOOTING.md) or create an issue in the repository.