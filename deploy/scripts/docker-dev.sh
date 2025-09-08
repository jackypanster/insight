#!/bin/bash

# Insight Docker Development Environment Launcher
# Usage: ./docker-dev.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}🐳 Insight Docker Development Environment${NC}"
echo "========================================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${YELLOW}📝 Please edit .env file and add your OPENROUTER_API_KEY${NC}"
    else
        echo -e "${RED}❌ .env.example not found. Please create .env manually.${NC}"
        exit 1
    fi
fi

# Change to project root
cd "$PROJECT_ROOT"

# Parse command line arguments
REBUILD=false
CLEAN=false
BACKGROUND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --background|-d)
            BACKGROUND=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --rebuild     Rebuild the Docker image"
            echo "  --clean       Clean up containers and volumes"
            echo "  --background  Run in background (detached mode)"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Clean up if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning up containers and volumes...${NC}"
    docker compose -f deploy/docker/docker-compose.yml down -v --remove-orphans 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
    echo -e "${GREEN}✅ Cleanup completed${NC}"
fi

# Build/rebuild image if requested
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}🔨 Building development image...${NC}"
    docker compose -f deploy/docker/docker-compose.yml build insight-dev --no-cache
    echo -e "${GREEN}✅ Build completed${NC}"
fi

# Start the development environment
echo -e "${BLUE}🚀 Starting development environment...${NC}"

if [ "$BACKGROUND" = true ]; then
    docker compose -f deploy/docker/docker-compose.yml up insight-dev -d
    echo -e "${GREEN}✅ Development environment started in background${NC}"
    echo -e "${BLUE}📝 View logs with: docker logs -f insight-dev${NC}"
    echo -e "${BLUE}🌐 Web server: http://localhost:3000${NC}"
    echo -e "${BLUE}🔍 Debug port: 9229${NC}"
else
    echo -e "${GREEN}✅ Starting interactive development session...${NC}"
    echo -e "${BLUE}🌐 Web server will be available at: http://localhost:3000${NC}"
    echo -e "${BLUE}🔍 Debug port: 9229${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    echo ""
    
    # Trap Ctrl+C to gracefully stop
    trap 'echo -e "\n${YELLOW}🛑 Stopping development environment...${NC}"; docker compose -f deploy/docker/docker-compose.yml stop insight-dev; exit 0' INT
    
    docker compose -f deploy/docker/docker-compose.yml up insight-dev
fi