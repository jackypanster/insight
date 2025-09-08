#!/bin/bash

# Insight Docker Test Script
# Usage: ./docker-test.sh [options]

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

echo -e "${BLUE}🐳 Insight Docker Test Runner${NC}"
echo "============================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Parse command line arguments
TEST_TYPE="all"
COVERAGE=false
WATCH=false
REBUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            TEST_TYPE="unit"
            shift
            ;;
        --integration)
            TEST_TYPE="integration"
            shift
            ;;
        --edge)
            TEST_TYPE="edge"
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --rebuild)
            REBUILD=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --unit        Run unit tests only"
            echo "  --integration Run integration tests only"
            echo "  --edge        Run edge case tests only"
            echo "  --coverage    Generate coverage report"
            echo "  --watch       Run tests in watch mode"
            echo "  --rebuild     Rebuild test image first"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Rebuild image if requested
if [ "$REBUILD" = true ]; then
    echo -e "${YELLOW}🔨 Building test image...${NC}"
    docker compose -f deploy/docker/docker-compose.yml build insight-test --no-cache
fi

# Determine test command
TEST_CMD=""
case $TEST_TYPE in
    "unit")
        TEST_CMD="pnpm test:unit"
        ;;
    "integration")
        TEST_CMD="pnpm test:integration"
        ;;
    "edge")
        TEST_CMD="pnpm test:edge"
        ;;
    "all")
        if [ "$COVERAGE" = true ]; then
            TEST_CMD="pnpm test:coverage"
        else
            TEST_CMD="pnpm test"
        fi
        ;;
esac

# Add watch mode if requested
if [ "$WATCH" = true ]; then
    TEST_CMD="pnpm test:watch"
fi

echo -e "${BLUE}🧪 Running tests: $TEST_TYPE${NC}"

# Run tests in container
if [ "$WATCH" = true ]; then
    echo -e "${YELLOW}👀 Starting tests in watch mode...${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop${NC}"
    docker compose -f deploy/docker/docker-compose.yml run --rm insight-test sh -c "pnpm install && $TEST_CMD"
else
    # Run tests and capture exit code
    set +e
    docker compose -f deploy/docker/docker-compose.yml run --rm insight-test sh -c "pnpm install && $TEST_CMD"
    TEST_EXIT_CODE=$?
    set -e
    
    # Show results
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed!${NC}"
        
        # If coverage was requested, show how to view the report
        if [ "$COVERAGE" = true ]; then
            echo -e "${BLUE}📊 Coverage report generated${NC}"
            echo -e "${BLUE}   View with: open coverage/index.html${NC}"
        fi
    else
        echo -e "${RED}❌ Tests failed with exit code: $TEST_EXIT_CODE${NC}"
        exit $TEST_EXIT_CODE
    fi
fi

# Clean up test containers
echo -e "${YELLOW}🧹 Cleaning up test containers...${NC}"
docker compose -f deploy/docker/docker-compose.yml down --remove-orphans 2>/dev/null || true