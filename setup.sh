#!/bin/bash

# AI Content Agent - Quick Setup Script
# This script automates the initial setup process

set -e

echo "🚀 AI Content Agent - Setup Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Check MongoDB
if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
    echo -e "${YELLOW}⚠️  MongoDB not found in PATH${NC}"
    echo -e "${YELLOW}   You'll need to start MongoDB manually or use Docker:${NC}"
    echo -e "${YELLOW}   docker run -d -p 27017:27017 --name mongodb mongo:latest${NC}"
else
    echo -e "${GREEN}✅ MongoDB found${NC}"
fi

echo ""
echo "📦 Installing dependencies..."

# Backend setup
echo ""
echo "🔧 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit backend/.env and add your ANTHROPIC_API_KEY${NC}"
fi

echo "Installing backend dependencies..."
npm install

echo ""
echo "🔧 Setting up frontend..."
cd ../frontend

echo "Installing frontend dependencies..."
npm install

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit backend/.env and add your ANTHROPIC_API_KEY"
echo "   2. Start MongoDB (if not running):"
echo "      docker run -d -p 27017:27017 --name mongodb mongo:latest"
echo "   3. Seed the database:"
echo "      cd backend && npm run seed"
echo "   4. Start the backend:"
echo "      cd backend && npm run dev"
echo "   5. In a new terminal, start the frontend:"
echo "      cd frontend && npm run dev"
echo ""
echo "🌐 The app will be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000"
echo ""
echo "📚 For more information, see README.md"
echo ""
