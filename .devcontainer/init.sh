#!/bin/bash
echo "Initializing development environment..."

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        NODE_OPTIONS=--max-old-space-size=4096 npm install --prefer-offline --no-audit
    else
        echo "Dependencies already installed. Use 'npm install' to update if needed."
    fi
fi

echo "Development environment ready!"