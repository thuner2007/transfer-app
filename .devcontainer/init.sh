#!/bin/bash
echo "Initializing development environment..."

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    npm install
fi

echo "Development environment ready!"