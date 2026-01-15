# 🚀 VPS Deployment Guide

Complete guide for deploying GradeX to a VPS server.

## 📋 Prerequisites

- VPS server with Ubuntu 20.04+ or similar Linux distribution
- SSH access to the VPS
- Domain name (optional, can use IP address)
- Node.js 18+ installed
- Go 1.21+ installed (for backend)
- PM2 installed globally
- Nginx installed

## 🔧 Step 1: Server Setup

### 1.1 Connect to VPS

```bash
ssh root@your-vps-ip
# or
ssh user@your-vps-ip
```

### 1.2 Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Go
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install build tools (for native modules)
sudo apt install -y build-essential python3
```

### 1.3 Create Application User (Optional but Recommended)

```bash
# Create a non-root user for the application
sudo adduser gradex
sudo usermod -aG sudo gradex
su - gradex
```

## 📦 Step 2: Deploy Application

### 2.1 Clone Repository

```bash
cd /var/www  # or your preferred directory
sudo git clone https://github.com/your-username/GradeX.git
sudo chown -R $USER:$USER GradeX
cd GradeX
```

### 2.2 Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Go backend dependencies
cd gradex-backend
go mod download
cd ..
```

### 2.3 Set Up Environment Variables

```bash
# Create .env file
nano .env
```

Add the following:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=https://phlggcheaajkupppozho.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Upstash Redis (if using)
UPSTASH_REDIS__KV_REST_API_URL=your-redis-url
UPSTASH_REDIS__KV_REST_API_TOKEN=your-redis-token

# VPS Configuration (if still using VPS services)
VPS_LOGIN_URL=http://65.20.84.46:5000
VPS_API_KEY=32631058927400e8e13cd7a7c35cf3381ffc2af66b926a3d79c2b28403769f73

# Go Backend Configuration (if running separately)
SRM_BACKEND_PORT=8080
```

### 2.4 Build Frontend

```bash
npm run build
```

This creates a `dist/` folder with production-ready files.

## 🎯 Step 3: Configure Go Backend

### 3.1 Build Go Backend

```bash
cd gradex-backend
go build -o bin/gradex-backend main.go
cd ..
```

### 3.2 Create Go Backend .env (if separate)

```bash
cd gradex-backend
nano .env
```

Add:
```env
PORT=8080
SUPABASE_URL=https://phlggcheaajkupppozho.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 🔄 Step 4: Set Up PM2

### 4.1 Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

Add:

```javascript
module.exports = {
  apps: [
    {
      name: 'gradex-api',
      script: 'server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'gradex-backend',
      cwd: './gradex-backend',
      script: './bin/gradex-backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
```

### 4.2 Create Logs Directory

```bash
mkdir -p logs
```

### 4.3 Start Applications with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Follow the command PM2 outputs to enable startup on boot.

## 🌐 Step 5: Configure Nginx

### 5.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/gradex
```

Add:

```nginx
# Upstream for API server
upstream gradex_api {
    server localhost:3000;
    keepalive 64;
}

# Upstream for Go backend
upstream gradex_backend {
    server localhost:8080;
    keepalive 64;
}

# HTTP Server (redirect to HTTPS)
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Root directory (Vite build output)
    root /var/www/GradeX/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # API routes - proxy to Express server
    location /api/ {
        proxy_pass http://gradex_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # SRM Backend routes - proxy to Go backend
    location /api/srm/ {
        proxy_pass http://gradex_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files
    location / {
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 5.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/gradex /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 5.3 Set Up SSL with Let's Encrypt (Optional but Recommended)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 🔥 Step 6: Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## ✅ Step 7: Verify Deployment

### 7.1 Check PM2 Status

```bash
pm2 status
pm2 logs gradex-api
pm2 logs gradex-backend
```

### 7.2 Check Nginx Status

```bash
sudo systemctl status nginx
```

### 7.3 Test Endpoints

```bash
# Test API health
curl http://localhost:3000/health

# Test Go backend
curl http://localhost:8080/health

# Test through Nginx
curl https://your-domain.com/health
curl https://your-domain.com/api/admin?action=cache-status
```

## 🔄 Step 8: Deployment Script

Create a deployment script for easy updates:

```bash
nano deploy.sh
```

Add:

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Build Go backend
echo "🔨 Building Go backend..."
cd gradex-backend
go build -o bin/gradex-backend main.go
cd ..

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 restart ecosystem.config.js

# Show status
echo "✅ Deployment complete!"
pm2 status

echo "📊 Application logs:"
pm2 logs --lines 20
```

Make it executable:

```bash
chmod +x deploy.sh
```

## 📊 Monitoring

### View Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f logs/api-out.log
tail -f logs/backend-out.log
```

### PM2 Commands

```bash
pm2 status          # Check status
pm2 restart all      # Restart all apps
pm2 stop all         # Stop all apps
pm2 logs             # View logs
pm2 monit            # Monitor dashboard
pm2 delete all       # Remove all apps
```

## 🔧 Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000
sudo lsof -i :8080

# Kill process
sudo kill -9 <PID>
```

### Issue: PM2 Not Starting on Boot

```bash
pm2 startup
# Follow the command it outputs
```

### Issue: Nginx 502 Bad Gateway

1. Check if API server is running: `pm2 status`
2. Check API server logs: `pm2 logs gradex-api`
3. Check Nginx error log: `sudo tail -f /var/log/nginx/error.log`

### Issue: SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

## 🎯 Quick Reference

### Common Commands

```bash
# Deploy updates
./deploy.sh

# Restart services
pm2 restart all
sudo systemctl restart nginx

# View logs
pm2 logs
sudo tail -f /var/log/nginx/error.log

# Check status
pm2 status
sudo systemctl status nginx
```

### File Locations

- Application: `/var/www/GradeX`
- Nginx config: `/etc/nginx/sites-available/gradex`
- PM2 config: `/var/www/GradeX/ecosystem.config.js`
- Environment: `/var/www/GradeX/.env`
- Logs: `/var/www/GradeX/logs/`

## 📝 Notes

- Replace `your-domain.com` with your actual domain
- Replace environment variable placeholders with actual values
- Adjust ports if needed (3000 for API, 8080 for Go backend)
- For production, consider using a process manager like systemd instead of PM2
- Set up automated backups for the database
- Monitor server resources (CPU, memory, disk)

---

**Deployment Complete!** 🎉

Your GradeX application should now be running on your VPS.

