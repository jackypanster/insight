#!/bin/bash

# Pre-commit hook script for Insight project
# Ensures code quality before commits are allowed

set -e  # Exit on any error

echo "🔍 Running pre-commit checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_status $RED "❌ Not in a git repository"
    exit 1
fi

# Check if pnpm is available
if ! command_exists pnpm; then
    print_status $RED "❌ pnpm is not installed. Please install it first."
    exit 1
fi

# Get list of staged TypeScript files
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)
STAGED_TEST_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E 'test\.(ts|tsx)$|spec\.(ts|tsx)$' || true)

if [ -z "$STAGED_TS_FILES" ]; then
    print_status $YELLOW "⚠️  No TypeScript files staged for commit"
    exit 0
fi

print_status $GREEN "📁 Found $(echo $STAGED_TS_FILES | wc -w) staged TypeScript files"

# Step 1: Install dependencies if needed
print_status $YELLOW "📦 Checking dependencies..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_status $YELLOW "📦 Installing dependencies..."
    pnpm install
fi

# Step 2: Type checking
print_status $YELLOW "🔍 Running TypeScript type checking..."
if ! pnpm run type-check; then
    print_status $RED "❌ TypeScript type checking failed"
    exit 1
fi
print_status $GREEN "✅ Type checking passed"

# Step 3: Linting
print_status $YELLOW "🧹 Running ESLint..."
if ! pnpm run lint; then
    print_status $YELLOW "🔧 Attempting to fix linting issues..."
    if pnpm run lint:fix; then
        print_status $GREEN "✅ Linting issues fixed automatically"
        
        # Re-add fixed files to staging
        echo "$STAGED_TS_FILES" | xargs git add
    else
        print_status $RED "❌ Linting failed and couldn't be fixed automatically"
        print_status $YELLOW "Please fix the linting issues manually and try again"
        exit 1
    fi
else
    print_status $GREEN "✅ Linting passed"
fi

# Step 4: Formatting
print_status $YELLOW "💅 Checking code formatting..."
if ! pnpm run format:check; then
    print_status $YELLOW "🔧 Fixing formatting issues..."
    pnpm run format
    print_status $GREEN "✅ Code formatted automatically"
    
    # Re-add formatted files to staging
    echo "$STAGED_TS_FILES" | xargs git add
else
    print_status $GREEN "✅ Formatting is correct"
fi

# Step 5: Run unit tests (but not integration/edge tests for speed)
print_status $YELLOW "🧪 Running unit tests..."
if ! pnpm run test:unit; then
    print_status $RED "❌ Unit tests failed"
    print_status $YELLOW "Please fix the failing tests before committing"
    exit 1
fi
print_status $GREEN "✅ Unit tests passed"

# Step 6: Test related to staged files (if any test files are staged)
if [ -n "$STAGED_TEST_FILES" ]; then
    print_status $YELLOW "🧪 Running tests for staged test files..."
    
    # Extract test file patterns for targeted testing
    TEST_PATTERNS=""
    for test_file in $STAGED_TEST_FILES; do
        TEST_PATTERNS="$TEST_PATTERNS $test_file"
    done
    
    if [ -n "$TEST_PATTERNS" ]; then
        if ! pnpm vitest run $TEST_PATTERNS; then
            print_status $RED "❌ Staged tests failed"
            exit 1
        fi
        print_status $GREEN "✅ Staged tests passed"
    fi
fi

# Step 7: Check for common issues
print_status $YELLOW "🔍 Checking for common issues..."

# Check for console.log statements (except in test files)
CONSOLE_LOGS=$(echo "$STAGED_TS_FILES" | grep -v test | xargs grep -l "console\." 2>/dev/null || true)
if [ -n "$CONSOLE_LOGS" ]; then
    print_status $YELLOW "⚠️  Found console statements in:"
    echo "$CONSOLE_LOGS"
    print_status $YELLOW "Consider removing console statements before committing to production code"
fi

# Check for TODO comments
TODOS=$(echo "$STAGED_TS_FILES" | xargs grep -n "TODO\|FIXME\|XXX" 2>/dev/null || true)
if [ -n "$TODOS" ]; then
    print_status $YELLOW "⚠️  Found TODO/FIXME comments:"
    echo "$TODOS"
fi

# Check for debugging statements
DEBUG_STATEMENTS=$(echo "$STAGED_TS_FILES" | xargs grep -n "debugger\|console\.trace" 2>/dev/null || true)
if [ -n "$DEBUG_STATEMENTS" ]; then
    print_status $RED "❌ Found debugging statements:"
    echo "$DEBUG_STATEMENTS"
    print_status $RED "Please remove debugging statements before committing"
    exit 1
fi

# Step 8: Build check (quick validation)
print_status $YELLOW "🏗️  Running build check..."
if ! pnpm run build; then
    print_status $RED "❌ Build failed"
    print_status $YELLOW "Please fix build issues before committing"
    exit 1
fi
print_status $GREEN "✅ Build check passed"

# Step 9: Final validation
print_status $YELLOW "🔍 Final validation..."

# Check that staged files still exist and are valid
for file in $STAGED_TS_FILES; do
    if [ ! -f "$file" ]; then
        print_status $RED "❌ Staged file $file no longer exists"
        exit 1
    fi
done

# Success!
print_status $GREEN "🎉 All pre-commit checks passed!"
print_status $GREEN "✅ Ready to commit $(echo $STAGED_TS_FILES | wc -w) files"

# Display summary
echo ""
echo "📋 Summary:"
echo "  - Type checking: ✅"
echo "  - Linting: ✅"
echo "  - Formatting: ✅"
echo "  - Unit tests: ✅"
echo "  - Build check: ✅"
echo ""
print_status $GREEN "🚀 Commit approved!"