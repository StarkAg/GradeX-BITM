#!/bin/bash

# GradeX VPS Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting GradeX deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the GradeX directory?${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main || git pull origin master || echo "⚠️  Could not pull changes (continuing...)"

# Install/update Node.js dependencies
echo -e "${YELLOW}📦 Installing/updating Node.js dependencies...${NC}"
npm install

# Build frontend
echo -e "${YELLOW}🏗️  Building frontend...${NC}"
npm run build

# Build Go backend if it exists
if [ -d "gradex-backend" ]; then
    echo -e "${YELLOW}🔨 Building Go backend...${NC}"
    cd gradex-backend
    go mod download
    go build -o bin/gradex-backend main.go
    cd ..
fi

# Restart PM2 processes if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 Restarting PM2 processes...${NC}"
    if [ -f "ecosystem.config.js" ]; then
        pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    else
        echo -e "${YELLOW}⚠️  ecosystem.config.js not found. Starting manually...${NC}"
        pm2 restart gradex-api || pm2 start server.js --name gradex-api
        if [ -f "gradex-backend/bin/gradex-backend" ]; then
            pm2 restart gradex-backend || pm2 start gradex-backend/bin/gradex-backend --name gradex-backend
        fi
    fi
    pm2 save
else
    echo -e "${YELLOW}⚠️  PM2 not found. Skipping PM2 restart.${NC}"
fi

# Show status
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Application status:"

if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""
    echo "📋 Recent logs:"
    pm2 logs --lines 10 --nostream
else
    echo "⚠️  PM2 not installed. Check your process manager."
fi

echo ""
echo -e "${GREEN}🎉 Deployment finished successfully!${NC}"

