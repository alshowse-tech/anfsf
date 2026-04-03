#!/bin/bash
# CSS Bundle Size Check Script
# Prevents Tailwind CSS configuration issues from causing incomplete builds
# 
# Usage: ./scripts/check-css-bundle.sh [output_dir]
# Default output_dir: .next/static/css

set -e

OUTPUT_DIR="${1:-.next/static/css}"
MIN_CSS_SIZE=30000  # Minimum expected CSS size in bytes (30KB)

echo "🔍 Checking CSS bundle size..."

# Find the main CSS file
CSS_FILE=$(find "$OUTPUT_DIR" -name "*.css" -type f 2>/dev/null | head -1)

if [ -z "$CSS_FILE" ]; then
  echo "❌ No CSS file found in $OUTPUT_DIR"
  exit 1
fi

CSS_SIZE=$(wc -c < "$CSS_FILE" | tr -d ' ')

echo "📊 CSS File: $CSS_FILE"
echo "📊 CSS Size: $CSS_SIZE bytes"

if [ "$CSS_SIZE" -lt "$MIN_CSS_SIZE" ]; then
  echo "❌ CSS bundle too small ($CSS_SIZE bytes < $MIN_CSS_SIZE bytes)"
  echo "💡 Possible causes:"
  echo "   - Tailwind CSS version mismatch (v3 vs v4 syntax)"
  echo "   - Incorrect postcss.config.js configuration"
  echo "   - Missing @import in globals.css"
  echo ""
  echo "🔧 Fix: Check globals.css uses correct Tailwind syntax:"
  echo "   - Tailwind v3: @tailwind base/components/utilities"
  echo "   - Tailwind v4: @import \"tailwindcss\""
  exit 1
fi

echo "✅ CSS bundle size OK ($CSS_SIZE bytes >= $MIN_CSS_SIZE bytes)"
exit 0
