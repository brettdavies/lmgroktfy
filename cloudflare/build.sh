#!/bin/bash
# cloudflare/build.sh - Main build script for Cloudflare Pages deployment
# This script minifies JS, CSS, and HTML files for deployment

set -e  # Exit immediately if a command exits with a non-zero status

# Record start time
BUILD_START_TIME=$(date +%s)

echo "Starting build process for Cloudflare Pages deployment..."

# Ensure we're in the project root directory
if [ "$(basename "$(pwd)")" = "cloudflare" ]; then
  echo "Running from cloudflare directory, moving to project root..."
  cd ..
fi

# Install minification tools
echo "Installing minification tools..."
npm install --no-save terser clean-css-cli html-minifier-terser

# Extract version and build information
VERSION=$(node -e "console.log(require('./package.json').version || '1.0.0')")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo "Building version $VERSION (commit: $GIT_COMMIT, branch: $GIT_BRANCH)"

# Clean and create dist directory
echo "Creating distribution directory..."
rm -rf dist
mkdir -p dist

# Define files and directories to include
echo "Copying essential files to dist..."

# Copy HTML files (excluding test files)
echo "  Copying HTML files..."
find . -maxdepth 1 -name "*.html" -not -name "test-*.html" -exec cp {} dist/ \;

# Copy favicon and other root assets
echo "  Copying root assets..."
[ -f favicon.ico ] && cp favicon.ico dist/
[ -f robots.txt ] && cp robots.txt dist/
[ -f sitemap.xml ] && cp sitemap.xml dist/
[ -f config.json ] && cp config.json dist/

# Create necessary directories
mkdir -p dist/js dist/css

# Create temporary files for statistics
JS_ORIG_SIZE=$(mktemp)
JS_MIN_SIZE=$(mktemp)
CSS_ORIG_SIZE=$(mktemp)
CSS_MIN_SIZE=$(mktemp)
HTML_ORIG_SIZE=$(mktemp)
HTML_MIN_SIZE=$(mktemp)

# Initialize statistics files
echo "0" > $JS_ORIG_SIZE
echo "0" > $JS_MIN_SIZE
echo "0" > $CSS_ORIG_SIZE
echo "0" > $CSS_MIN_SIZE
echo "0" > $HTML_ORIG_SIZE
echo "0" > $HTML_MIN_SIZE

# Process JavaScript files
echo "Processing JavaScript files..."
find js -name "*.js" -not -name "*.test.js" -not -name "*.spec.js" | while read file; do
  # Create output directory
  dir=$(dirname "$file")
  mkdir -p "dist/$dir"
  
  # Get filename
  filename=$(basename "$file")
  
  # Get original size
  original_size=$(wc -c < "$file")
  current_total=$(cat $JS_ORIG_SIZE)
  echo $((current_total + original_size)) > $JS_ORIG_SIZE
  
  # Minify
  echo "  Minifying $file..."
  npx terser "$file" --compress --mangle --output "dist/$dir/$filename"
  
  # Get minified size
  minified_size=$(wc -c < "dist/$dir/$filename")
  current_total=$(cat $JS_MIN_SIZE)
  echo $((current_total + minified_size)) > $JS_MIN_SIZE
  
  # Calculate reduction
  if [ $original_size -gt 0 ]; then
    reduction=$((100 - (minified_size * 100 / original_size)))
    echo "    Reduced by $reduction% ($original_size → $minified_size bytes)"
  else
    echo "    Original file was empty"
  fi
done

# Process CSS files
echo "Processing CSS files..."
find css -name "*.css" | while read file; do
  # Create output directory
  dir=$(dirname "$file")
  mkdir -p "dist/$dir"
  
  # Get filename
  filename=$(basename "$file")
  
  # Get original size
  original_size=$(wc -c < "$file")
  current_total=$(cat $CSS_ORIG_SIZE)
  echo $((current_total + original_size)) > $CSS_ORIG_SIZE
  
  # Minify
  echo "  Minifying $file..."
  npx cleancss -o "dist/$dir/$filename" "$file"
  
  # Get minified size
  minified_size=$(wc -c < "dist/$dir/$filename")
  current_total=$(cat $CSS_MIN_SIZE)
  echo $((current_total + minified_size)) > $CSS_MIN_SIZE
  
  # Calculate reduction
  if [ $original_size -gt 0 ]; then
    reduction=$((100 - (minified_size * 100 / original_size)))
    echo "    Reduced by $reduction% ($original_size → $minified_size bytes)"
  else
    echo "    Original file was empty"
  fi
done

# Process locales directory if it exists
echo "Processing locales..."
if [ -d "locales" ]; then
  echo "  Locales directory found"
  mkdir -p dist/locales
  
  # Create temporary files for JSON statistics
  JSON_ORIG_SIZE=$(mktemp)
  JSON_MIN_SIZE=$(mktemp)
  
  # Initialize statistics files
  echo "0" > $JSON_ORIG_SIZE
  echo "0" > $JSON_MIN_SIZE
  
  # Copy and minify locale files
  echo "  Minifying locale files..."
  find locales -name "*.json" -not -name "test-*.json" | while read file; do
    # Get original size
    original_size=$(wc -c < "$file")
    current_total=$(cat $JSON_ORIG_SIZE)
    echo $((current_total + original_size)) > $JSON_ORIG_SIZE
    
    # Get filename
    filename=$(basename "$file")
    
    # Minify JSON using Node.js
    echo "    Minifying $filename..."
    node -e "
      const fs = require('fs');
      const data = fs.readFileSync('$file', 'utf8');
      try {
        const json = JSON.parse(data);
        fs.writeFileSync('dist/locales/$filename', JSON.stringify(json));
      } catch (e) {
        console.error('Error minifying $filename:', e.message);
        fs.copyFileSync('$file', 'dist/locales/$filename');
      }
    "
    
    # Get minified size
    minified_size=$(wc -c < "dist/locales/$filename")
    current_total=$(cat $JSON_MIN_SIZE)
    echo $((current_total + minified_size)) > $JSON_MIN_SIZE
    
    # Calculate reduction
    if [ $original_size -gt 0 ]; then
      reduction=$((100 - (minified_size * 100 / original_size)))
      echo "      Reduced by $reduction% ($original_size → $minified_size bytes)"
    else
      echo "      Original file was empty"
    fi
  done
  
  # Read the JSON statistics
  TOTAL_JSON_ORIGINAL=$(cat $JSON_ORIG_SIZE)
  TOTAL_JSON_MINIFIED=$(cat $JSON_MIN_SIZE)
  
  # Clean up temporary files
  rm -f $JSON_ORIG_SIZE $JSON_MIN_SIZE
else
  echo "  No locales directory found, skipping"
  # Initialize JSON statistics to zero if no locales directory
  TOTAL_JSON_ORIGINAL=0
  TOTAL_JSON_MINIFIED=0
fi

# Minify HTML files
echo "Minifying HTML files..."
find dist -maxdepth 1 -name "*.html" | while read file; do
  # Get original size
  original_size=$(wc -c < "$file")
  current_total=$(cat $HTML_ORIG_SIZE)
  echo $((current_total + original_size)) > $HTML_ORIG_SIZE
  
  # Create temporary file
  temp_file=$(mktemp)
  
  # Minify
  echo "  Minifying $(basename "$file")..."
  npx html-minifier-terser \
    --collapse-whitespace \
    --remove-comments \
    --remove-optional-tags \
    --remove-redundant-attributes \
    --remove-script-type-attributes \
    --remove-tag-whitespace \
    --use-short-doctype \
    --minify-css true \
    --minify-js true \
    -o "$temp_file" \
    "$file"
  
  # Replace original with minified
  mv "$temp_file" "$file"
  
  # Get minified size
  minified_size=$(wc -c < "$file")
  current_total=$(cat $HTML_MIN_SIZE)
  echo $((current_total + minified_size)) > $HTML_MIN_SIZE
  
  # Calculate reduction
  if [ $original_size -gt 0 ]; then
    reduction=$((100 - (minified_size * 100 / original_size)))
    echo "    Reduced by $reduction% ($original_size → $minified_size bytes)"
  else
    echo "    Original file was empty"
  fi
done

# Read the final statistics
TOTAL_JS_ORIGINAL=$(cat $JS_ORIG_SIZE)
TOTAL_JS_MINIFIED=$(cat $JS_MIN_SIZE)
TOTAL_CSS_ORIGINAL=$(cat $CSS_ORIG_SIZE)
TOTAL_CSS_MINIFIED=$(cat $CSS_MIN_SIZE)
TOTAL_HTML_ORIGINAL=$(cat $HTML_ORIG_SIZE)
TOTAL_HTML_MINIFIED=$(cat $HTML_MIN_SIZE)

# Clean up temporary files
rm -f $JS_ORIG_SIZE $JS_MIN_SIZE $CSS_ORIG_SIZE $CSS_MIN_SIZE $HTML_ORIG_SIZE $HTML_MIN_SIZE

# Create build manifest
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
    "jsonOriginalSize": $TOTAL_JSON_ORIGINAL,
    "jsonMinifiedSize": $TOTAL_JSON_MINIFIED,
    "totalOriginalSize": $((TOTAL_JS_ORIGINAL + TOTAL_CSS_ORIGINAL + TOTAL_HTML_ORIGINAL + TOTAL_JSON_ORIGINAL)),
    "totalMinifiedSize": $((TOTAL_JS_MINIFIED + TOTAL_CSS_MINIFIED + TOTAL_HTML_MINIFIED + TOTAL_JSON_MINIFIED))
  }
}
EOF

# Validate the build output
echo "Validating build output..."
VALIDATION_ERRORS=0

# Validate JSON files
echo "  Validating JSON files..."
find dist/locales -name "*.json" | while read file; do
  echo "    Checking $file..."
  if ! node -e "
    try {
      const fs = require('fs');
      const data = fs.readFileSync('$file', 'utf8');
      JSON.parse(data);
      process.exit(0);
    } catch (e) {
      console.error('Error parsing $file:', e.message);
      process.exit(1);
    }
  "; then
    echo "      ERROR: Invalid JSON in $file"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  fi
done

# Validate JavaScript files
echo "  Validating JavaScript files..."
find dist/js -name "*.js" | while read file; do
  echo "    Checking $file..."
  if [ ! -s "$file" ]; then
    echo "      ERROR: Empty JavaScript file: $file"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  fi
  
  # Basic syntax check (optional, can be resource intensive)
  if ! node --check "$file" > /dev/null 2>&1; then
    echo "      WARNING: JavaScript syntax issues in $file"
    # Not counting as error since minified code might trigger false positives
  fi
done

# Validate CSS files
echo "  Validating CSS files..."
find dist/css -name "*.css" | while read file; do
  echo "    Checking $file..."
  if [ ! -s "$file" ]; then
    echo "      ERROR: Empty CSS file: $file"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  fi
done

# Validate HTML files
echo "  Validating HTML files..."
find dist -maxdepth 1 -name "*.html" | while read file; do
  echo "    Checking $file..."
  if [ ! -s "$file" ]; then
    echo "      ERROR: Empty HTML file: $file"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  fi
  
  # Check for basic HTML elements with more flexible pattern matching for minified HTML
  if ! grep -q "<html" "$file" || ! grep -q "<body" "$file"; then
    echo "      WARNING: HTML file $file may be missing essential elements"
    # Not counting as error since minification might change structure
  fi
done

# Check for required files
echo "  Checking for required files..."
REQUIRED_FILES=(
  "index.html"
  "js/script.js"
  "css/animations.css"
  "css/i18n.css"
  "js/config.js"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "dist/$file" ]; then
    echo "    ERROR: Required file missing: $file"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
  fi
done

# Final validation result
if [ $VALIDATION_ERRORS -gt 0 ]; then
  echo "Build validation failed with $VALIDATION_ERRORS errors"
  echo "Please fix the errors and try again"
  exit 1
else
  echo "Build validation successful!"
fi

# Calculate build time
BUILD_END_TIME=$(date +%s)
BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))
MINUTES=$((BUILD_DURATION / 60))
SECONDS=$((BUILD_DURATION % 60))

# Calculate total size reduction
TOTAL_ORIGINAL=$((TOTAL_JS_ORIGINAL + TOTAL_CSS_ORIGINAL + TOTAL_HTML_ORIGINAL + TOTAL_JSON_ORIGINAL))
TOTAL_MINIFIED=$((TOTAL_JS_MINIFIED + TOTAL_CSS_MINIFIED + TOTAL_HTML_MINIFIED + TOTAL_JSON_MINIFIED))

# Calculate percentage reductions safely (avoiding division by zero)
if [ $TOTAL_JS_ORIGINAL -gt 0 ]; then
  JS_REDUCTION=$((100 - (TOTAL_JS_MINIFIED * 100 / TOTAL_JS_ORIGINAL)))
else
  JS_REDUCTION=0
fi

if [ $TOTAL_CSS_ORIGINAL -gt 0 ]; then
  CSS_REDUCTION=$((100 - (TOTAL_CSS_MINIFIED * 100 / TOTAL_CSS_ORIGINAL)))
else
  CSS_REDUCTION=0
fi

if [ $TOTAL_HTML_ORIGINAL -gt 0 ]; then
  HTML_REDUCTION=$((100 - (TOTAL_HTML_MINIFIED * 100 / TOTAL_HTML_ORIGINAL)))
else
  HTML_REDUCTION=0
fi

if [ $TOTAL_JSON_ORIGINAL -gt 0 ]; then
  JSON_REDUCTION=$((100 - (TOTAL_JSON_MINIFIED * 100 / TOTAL_JSON_ORIGINAL)))
else
  JSON_REDUCTION=0
fi

if [ $TOTAL_ORIGINAL -gt 0 ]; then
  TOTAL_REDUCTION=$((100 - (TOTAL_MINIFIED * 100 / TOTAL_ORIGINAL)))
else
  TOTAL_REDUCTION=0
fi

echo "Build process completed successfully in ${MINUTES}m ${SECONDS}s!"
echo "Minified files are available in the 'dist' directory."
echo ""
echo "Build Statistics:"
echo "----------------"
echo "JavaScript: $TOTAL_JS_ORIGINAL → $TOTAL_JS_MINIFIED bytes ($JS_REDUCTION% reduction)"
echo "CSS: $TOTAL_CSS_ORIGINAL → $TOTAL_CSS_MINIFIED bytes ($CSS_REDUCTION% reduction)"
echo "HTML: $TOTAL_HTML_ORIGINAL → $TOTAL_HTML_MINIFIED bytes ($HTML_REDUCTION% reduction)"
echo "JSON: $TOTAL_JSON_ORIGINAL → $TOTAL_JSON_MINIFIED bytes ($JSON_REDUCTION% reduction)"
echo "Total: $TOTAL_ORIGINAL → $TOTAL_MINIFIED bytes ($TOTAL_REDUCTION% reduction)"
echo ""
echo "Build manifest created at dist/build-manifest.json" 