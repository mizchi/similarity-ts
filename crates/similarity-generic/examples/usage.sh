#!/bin/bash

echo "=== similarity-generic Usage Examples ==="
echo

echo "1. Basic usage with built-in language support:"
echo "   similarity-generic sample.go --language go"
echo

echo "2. Show all functions in a file:"
echo "   similarity-generic sample.go --language go --show-functions"
echo

echo "3. Use custom threshold:"
echo "   similarity-generic sample.go --language go --threshold 0.9"
echo

echo "4. Show supported languages:"
echo "   similarity-generic --supported"
echo

echo "5. Show language configuration:"
echo "   similarity-generic --show-config go"
echo "   similarity-generic --show-config go > my-go-config.json"
echo

echo "6. Use custom configuration file:"
echo "   similarity-generic sample.go --config configs/go.json"
echo

echo "7. Create and use a modified configuration:"
echo "   # Get base configuration"
echo "   similarity-generic --show-config go > my-config.json"
echo "   # Edit my-config.json to customize"
echo "   # Use the custom configuration"
echo "   similarity-generic sample.go --config my-config.json"
echo

echo "8. Analyze multiple files:"
echo "   find . -name '*.go' -exec similarity-generic {} --language go \;"
echo

echo "9. Output in VSCode-compatible format (default):"
echo "   similarity-generic sample.go --language go"
echo "   # Click on the file paths in VSCode terminal to jump to location"