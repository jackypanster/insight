#!/bin/bash

# Insight Docker Cleanup Script
# Usage: ./docker-clean.sh [options]

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

echo -e "${BLUE}🐳 Insight Docker Cleanup${NC}"
echo "========================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Parse command line arguments
CLEAN_CONTAINERS=false
CLEAN_IMAGES=false
CLEAN_VOLUMES=false
CLEAN_ALL=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --containers)
            CLEAN_CONTAINERS=true
            shift
            ;;
        --images)
            CLEAN_IMAGES=true
            shift
            ;;
        --volumes)
            CLEAN_VOLUMES=true
            shift
            ;;
        --all)
            CLEAN_ALL=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --containers  Stop and remove containers"
            echo "  --images      Remove images"
            echo "  --volumes     Remove volumes (WARNING: data loss)"
            echo "  --all         Clean everything (containers, images, volumes)"
            echo "  --force       Skip confirmation prompts"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --containers              # Stop and remove containers only"
            echo "  $0 --all                     # Clean everything (with confirmation)"
            echo "  $0 --all --force             # Clean everything (no confirmation)"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Set defaults if nothing specified
if [ "$CLEAN_CONTAINERS" = false ] && [ "$CLEAN_IMAGES" = false ] && [ "$CLEAN_VOLUMES" = false ] && [ "$CLEAN_ALL" = false ]; then
    CLEAN_CONTAINERS=true
fi

# Set all flags if --all specified
if [ "$CLEAN_ALL" = true ]; then
    CLEAN_CONTAINERS=true
    CLEAN_IMAGES=true
    CLEAN_VOLUMES=true
fi

# Confirmation for destructive operations
if [ "$CLEAN_VOLUMES" = true ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}⚠️  WARNING: This will remove all Docker volumes, including:${NC}"
    echo -e "${YELLOW}   - node_modules cache${NC}"
    echo -e "${YELLOW}   - pnpm store cache${NC}"
    echo -e "${YELLOW}   - Generated documentation${NC}"
    echo -e "${YELLOW}   - Analysis cache${NC}"
    echo ""
    read -p "Are you sure you want to continue? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Operation cancelled.${NC}"
        exit 0
    fi
fi

# Stop and remove containers
if [ "$CLEAN_CONTAINERS" = true ]; then
    echo -e "${YELLOW}🛑 Stopping and removing containers...${NC}"
    
    # Stop containers
    docker compose -f deploy/docker/docker-compose.yml down --remove-orphans 2>/dev/null || true
    
    # Remove any remaining containers
    CONTAINERS=$(docker ps -a --filter "name=insight" --format "{{.Names}}" 2>/dev/null || true)
    if [ ! -z "$CONTAINERS" ]; then
        echo "$CONTAINERS" | xargs -r docker rm -f 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Containers cleaned${NC}"
fi

# Remove images
if [ "$CLEAN_IMAGES" = true ]; then
    echo -e "${YELLOW}🗑️  Removing images...${NC}"
    
    # Remove insight images
    docker images --filter "reference=insight*" --format "{{.Repository}}:{{.Tag}}" | xargs -r docker rmi -f 2>/dev/null || true
    
    # Remove dangling images
    DANGLING=$(docker images --filter "dangling=true" -q 2>/dev/null || true)
    if [ ! -z "$DANGLING" ]; then
        echo "$DANGLING" | xargs -r docker rmi -f 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Images cleaned${NC}"
fi

# Remove volumes
if [ "$CLEAN_VOLUMES" = true ]; then
    echo -e "${YELLOW}🗑️  Removing volumes...${NC}"
    
    # Remove project-specific volumes
    docker volume ls --filter "name=insight" --format "{{.Name}}" | xargs -r docker volume rm -f 2>/dev/null || true
    docker volume ls --filter "name=node_modules" --format "{{.Name}}" | xargs -r docker volume rm -f 2>/dev/null || true
    docker volume ls --filter "name=pnpm_store" --format "{{.Name}}" | xargs -r docker volume rm -f 2>/dev/null || true
    
    # Remove unused volumes
    docker volume prune -f 2>/dev/null || true
    
    echo -e "${GREEN}✅ Volumes cleaned${NC}"
fi

# System cleanup
echo -e "${YELLOW}🧹 Running system cleanup...${NC}"
docker system prune -f 2>/dev/null || true

# Show final status
echo -e "${GREEN}✅ Cleanup completed!${NC}"
echo ""
echo -e "${BLUE}📊 Current Docker usage:${NC}"
docker system df 2>/dev/null || true

echo ""
echo -e "${GREEN}🚀 Ready for fresh start:${NC}"
echo -e "${BLUE}   ./deploy/scripts/docker-dev.sh${NC}"