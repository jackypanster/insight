#!/bin/bash

# Insight Docker Build Script
# Usage: ./docker-build.sh [options]

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

echo -e "${BLUE}🐳 Insight Docker Build${NC}"
echo "======================"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Parse command line arguments
BUILD_TYPE="production"
NO_CACHE=false
PUSH=false
TAG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            BUILD_TYPE="development"
            shift
            ;;
        --prod)
            BUILD_TYPE="production"
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dev         Build development image"
            echo "  --prod        Build production image (default)"
            echo "  --no-cache    Build without using cache"
            echo "  --push        Push to registry after build"
            echo "  --tag TAG     Tag for the built image"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Set default tags
if [ -z "$TAG" ]; then
    if [ "$BUILD_TYPE" = "development" ]; then
        TAG="insight:dev"
    else
        TAG="insight:latest"
    fi
fi

# Build options
BUILD_OPTS=""
if [ "$NO_CACHE" = true ]; then
    BUILD_OPTS="--no-cache"
fi

# Build the appropriate image
if [ "$BUILD_TYPE" = "development" ]; then
    echo -e "${YELLOW}🔨 Building development image: $TAG${NC}"
    docker build -f deploy/docker/Dockerfile.dev -t "$TAG" $BUILD_OPTS .
else
    echo -e "${YELLOW}🔨 Building production image: $TAG${NC}"
    docker build -f deploy/docker/Dockerfile -t "$TAG" $BUILD_OPTS .
fi

# Check build result
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully: $TAG${NC}"
    
    # Show image info
    echo -e "${BLUE}📊 Image information:${NC}"
    docker images "$TAG" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
    
    # Push if requested
    if [ "$PUSH" = true ]; then
        echo -e "${YELLOW}📤 Pushing image to registry...${NC}"
        docker push "$TAG"
        echo -e "${GREEN}✅ Image pushed successfully${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🚀 Ready to run:${NC}"
    if [ "$BUILD_TYPE" = "development" ]; then
        echo -e "${BLUE}   docker run -it --rm -p 3000:3000 -v \$(pwd):/app $TAG${NC}"
    else
        echo -e "${BLUE}   docker run -it --rm -p 3000:3000 $TAG${NC}"
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi