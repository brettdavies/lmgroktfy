#!/bin/bash
# cloudflare/build.sh - Main build script for Cloudflare Pages deployment
# This script minifies JS, CSS, and HTML files for deployment

set -e  # Exit immediately if a command exits with a non-zero status

# Function to clean up on failure
cleanup() {
  echo "Build failed! Cleaning up..."
  # Only remove dist if it exists and we're not in a production environment
  if [ -d "dist" ] && [ "$CI" != "true" ]; then
    echo "Removing dist directory..."
    rm -rf dist
  fi
  echo "Exiting with error code 1"
  exit 1
}

# Trap errors and call cleanup
trap cleanup ERR

# Record start time
BUILD_START_TIME=$(date +%s)

echo "Starting build process for Cloudflare Pages deployment..."

# Ensure we're in the right directory
# If we're in the cloudflare directory, move up one level
if [ "$(basename "$(pwd)")" = "cloudflare" ]; then
  echo "Running from cloudflare directory, moving to project root..."
  cd ..
fi

# Define required files - these must exist for a valid build
REQUIRED_FILES=(
  "index.html"
  "js/script.js"
  "css/animations.css"
  "css/i18n.css"
  "js/config.js"
)

# Install minification tools (without modifying package.json)
echo "Installing minification tools..."
npm install --no-save terser clean-css-cli html-minifier-terser || {
  echo "ERROR: Failed to install minification tools"
  cleanup
}

# Extract version from package.json
VERSION=$(node -e "console.log(require('./package.json').version || '1.0.0')")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "Building version $VERSION (commit: $GIT_COMMIT, branch: $GIT_BRANCH)"

# First create a clean dist directory
echo "Creating distribution directory structure..."
rm -rf dist
mkdir -p dist/js dist/css

# Check for required source files before proceeding
echo "Validating required source files..."
MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Required file not found: $file"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done

if [ $MISSING_FILES -gt 0 ]; then
  echo "Build failed: $MISSING_FILES required files are missing"
  cleanup
fi

# Copy essential HTML files (excluding test files)
echo "Copying only essential files to dist directory..."
echo "  Copying HTML files..."
find . -maxdepth 1 -name "*.html" -not -name "test-*.html" -exec cp {} dist/ \;

# Copy favicon and other root assets
echo "  Copying root assets..."
[ -f favicon.ico ] && cp favicon.ico dist/
[ -f robots.txt ] && cp robots.txt dist/
[ -f sitemap.xml ] && cp sitemap.xml dist/

# Handle locales directory (for i18n)
echo "  Handling locales..."
if [ -d "locales" ]; then
  echo "    Locales directory found"
  # Create the locales directory in dist
  mkdir -p dist/locales
  # Check if there are any files to copy
  LOCALE_FILES=$(find locales -type f | wc -l)
  if [ "$LOCALE_FILES" -gt 0 ]; then
    echo "    Copying $LOCALE_FILES locale files"
    # Copy each file individually to avoid issues
    find locales -type f | while read file; do
      target_dir="dist/$(dirname "$file")"
      mkdir -p "$target_dir"
      cp "$file" "$target_dir/"
    done
  else
    echo "    No locale files found, skipping"
  fi
else
  echo "    No locales directory found, skipping"
fi

# Copy any necessary configuration files
echo "  Copying configuration..."
[ -f config.json ] && cp config.json dist/

# We'll handle JS and CSS files separately with minification
# No need to copy them here as they'll be processed below

# Track minification statistics
TOTAL_JS_ORIGINAL=0
TOTAL_JS_MINIFIED=0
TOTAL_CSS_ORIGINAL=0
TOTAL_CSS_MINIFIED=0
TOTAL_HTML_ORIGINAL=0
TOTAL_HTML_MINIFIED=0

# Minify JavaScript files
echo "Minifying JavaScript files..."
find js -name "*.js" -not -name "*.test.js" -not -name "*.spec.js" | while read file; do
  # Create the output directory structure
  output_dir="dist/$(dirname "$file")"
  mkdir -p "$output_dir"
  
  # Get the filename without extension
  filename=$(basename "$file" .js)
  
  # Get original file size
  original_size=$(wc -c < "$file")
  TOTAL_JS_ORIGINAL=$((TOTAL_JS_ORIGINAL + original_size))
  
  # Minify the file
  echo "  Processing $file..."
  npx terser "$file" --compress --mangle --output "$output_dir/$filename.js" || {
    echo "ERROR: Failed to minify $file"
    exit 1  # This will trigger the trap
  }
  
  # Get minified file size
  minified_size=$(wc -c < "$output_dir/$filename.js")
  TOTAL_JS_MINIFIED=$((TOTAL_JS_MINIFIED + minified_size))
  
  # Calculate reduction percentage
  reduction=$(( (original_size - minified_size) * 100 / original_size ))
  echo "    Reduced by $reduction% ($original_size → $minified_size bytes)"
done

# Minify CSS files
echo "Minifying CSS files..."
find css -name "*.css" | while read file; do
  # Create the output directory structure
  output_dir="dist/$(dirname "$file")"
  mkdir -p "$output_dir"
  
  # Get the filename without extension
  filename=$(basename "$file" .css)
  
  # Get original file size
  original_size=$(wc -c < "$file")
  TOTAL_CSS_ORIGINAL=$((TOTAL_CSS_ORIGINAL + original_size))
  
  # Minify the file
  echo "  Processing $file..."
  npx cleancss -o "$output_dir/$filename.css" "$file" || {
    echo "ERROR: Failed to minify $file"
    exit 1  # This will trigger the trap
  }
  
  # Get minified file size
  minified_size=$(wc -c < "$output_dir/$filename.css")
  TOTAL_CSS_MINIFIED=$((TOTAL_CSS_MINIFIED + minified_size))
  
  # Calculate reduction percentage
  reduction=$(( (original_size - minified_size) * 100 / original_size ))
  echo "    Reduced by $reduction% ($original_size → $minified_size bytes)"
done

# Minify HTML files
echo "Minifying HTML files..."
find dist -maxdepth 1 -name "*.html" | while read file; do
  filename=$(basename "$file")
  
  # Get original file size (already in dist)
  original_size=$(wc -c < "$file")
  TOTAL_HTML_ORIGINAL=$((TOTAL_HTML_ORIGINAL + original_size))
  
  echo "  Processing $file..."
  # Create a temporary file for the minified output
  temp_file=$(mktemp)
  
  npx html-minifier-terser --collapse-whitespace --remove-comments --remove-optional-tags --remove-redundant-attributes --remove-script-type-attributes --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true --input-dir dist/ --output "$temp_file" --file-ext html "$filename" || {
    echo "ERROR: Failed to minify $file"
    rm -f "$temp_file"
    exit 1  # This will trigger the trap
  }
  
  # Replace the original with the minified version
  mv "$temp_file" "dist/$filename"
  
  # Get minified file size
  minified_size=$(wc -c < "dist/$filename")
  TOTAL_HTML_MINIFIED=$((TOTAL_HTML_MINIFIED + minified_size))
  
  # Calculate reduction percentage
  reduction=$(( (original_size - minified_size) * 100 / original_size ))
  echo "    Reduced by $reduction% ($original_size → $minified_size bytes)"
done

# Create build manifest file
echo "Creating build manifest..."
cat > dist/build-manifest.json << EOF
{
  "version": "$VERSION",
  "buildDate": "$BUILD_DATE",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "environment": "production",
  "buildStats": {
    "jsOriginalSize": $TOTAL_JS_ORIGINAL,
    "jsMinifiedSize": $TOTAL_JS_MINIFIED,
    "cssOriginalSize": $TOTAL_CSS_ORIGINAL,
    "cssMinifiedSize": $TOTAL_CSS_MINIFIED,
    "htmlOriginalSize": $TOTAL_HTML_ORIGINAL,
    "htmlMinifiedSize": $TOTAL_HTML_MINIFIED,
    "totalOriginalSize": $((TOTAL_JS_ORIGINAL + TOTAL_CSS_ORIGINAL + TOTAL_HTML_ORIGINAL)),
    "totalMinifiedSize": $((TOTAL_JS_MINIFIED + TOTAL_CSS_MINIFIED + TOTAL_HTML_MINIFIED))
  }
}
EOF

# Validate the build contents
echo "Validating build contents..."
VALIDATION_ERRORS=0

# Check for required files in the build
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "dist/$file" ]; then
    echo "ERROR: Required file missing from build: $file"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  fi
done

# Check for empty directories
EMPTY_DIRS=$(find dist -type d -empty | wc -l)
if [ $EMPTY_DIRS -gt 0 ]; then
  echo "WARNING: Build contains $EMPTY_DIRS empty directories"
fi

# Check for minified file sizes (warning only)
echo "Checking minified file sizes..."
find dist -type f \( -name "*.js" -o -name "*.css" \) | while read file; do
  SIZE=$(wc -c < "$file")
  if [ $SIZE -lt 100 ]; then
    echo "WARNING: File $file is suspiciously small ($SIZE bytes)"
  fi
done

# Final validation result
if [ $VALIDATION_ERRORS -gt 0 ]; then
  echo "Build validation failed with $VALIDATION_ERRORS errors"
  cleanup
else
  echo "Build validation successful!"
fi

# Calculate build time
BUILD_END_TIME=$(date +%s)
BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))
MINUTES=$((BUILD_DURATION / 60))
SECONDS=$((BUILD_DURATION % 60))

# Calculate total size reduction
TOTAL_ORIGINAL=$((TOTAL_JS_ORIGINAL + TOTAL_CSS_ORIGINAL + TOTAL_HTML_ORIGINAL))
TOTAL_MINIFIED=$((TOTAL_JS_MINIFIED + TOTAL_CSS_MINIFIED + TOTAL_HTML_MINIFIED))
TOTAL_REDUCTION=$(( (TOTAL_ORIGINAL - TOTAL_MINIFIED) * 100 / TOTAL_ORIGINAL ))

echo "Build process completed successfully in ${MINUTES}m ${SECONDS}s!"
echo "Minified files are available in the 'dist' directory."
echo "Build manifest created at dist/build-manifest.json"
echo ""
echo "Build Statistics:"
echo "----------------"
echo "JavaScript: $TOTAL_JS_ORIGINAL → $TOTAL_JS_MINIFIED bytes ($(( (TOTAL_JS_ORIGINAL - TOTAL_JS_MINIFIED) * 100 / TOTAL_JS_ORIGINAL ))% reduction)"
echo "CSS: $TOTAL_CSS_ORIGINAL → $TOTAL_CSS_MINIFIED bytes ($(( (TOTAL_CSS_ORIGINAL - TOTAL_CSS_MINIFIED) * 100 / TOTAL_CSS_ORIGINAL ))% reduction)"
echo "HTML: $TOTAL_HTML_ORIGINAL → $TOTAL_HTML_MINIFIED bytes ($(( (TOTAL_HTML_ORIGINAL - TOTAL_HTML_MINIFIED) * 100 / TOTAL_HTML_ORIGINAL ))% reduction)"
echo "Total: $TOTAL_ORIGINAL → $TOTAL_MINIFIED bytes ($TOTAL_REDUCTION% reduction)" 