#!/bin/bash
set -e

# Set container environment variable to disable spinners
export DOCKER_CONTAINER=1

echo "🐳 Starting Insight development environment..."
echo "📦 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"
echo "🚀 Starting development server..."
echo "   - Web server: http://localhost:3000"
echo "   - Debug port: 9229"
echo "   - Hot reload: enabled"
echo ""

# Check if examples directory exists and has documentation
if [ -d "/app/examples" ] && [ -f "/app/examples/README.md" ]; then
    echo "📚 Starting web server with example documentation..."
else
    echo "📚 Starting web server (no examples found, will create default documentation)..."
    # Create a simple example for the development environment
    mkdir -p /app/examples
    echo "# Welcome to Insight Development Environment

This is a development server for Insight documentation generator.

## Quick Start
1. Mount your Python project to analyze
2. Use the CLI to generate documentation
3. View results in this web interface" > /app/examples/README.md
fi

echo "🌐 Web server starting on http://localhost:3000"
echo "🔗 Access from outside container: http://localhost:3000"

# Start the web server - this should keep the container running
exec tsx src/cli/index.ts serve --port 3000 --host 0.0.0.0 --docs-dir examples
