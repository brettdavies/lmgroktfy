# Cloudflare Pages Configuration

This directory contains configuration files and scripts for deploying the project to Cloudflare Pages.

## Files

- `build.sh`: The main build script that Cloudflare Pages executes during deployment. This script:
  - Installs minification tools
  - Creates a distribution directory
  - Minifies JavaScript, CSS, and HTML files
  - Copies all other assets to the distribution directory

- `cloudflare-pages.json`: Configuration file documenting the Cloudflare Pages settings. Note that this file is for documentation purposes only - the actual configuration is set in the Cloudflare Pages dashboard.

## Cloudflare Pages Dashboard Configuration

When setting up this project in the Cloudflare Pages dashboard, use the following settings:

### Build Settings

- **Production branch**: `main`
- **Build command**: `bash cloudflare/build.sh`
- **Build output directory**: `dist`
- **Environment variables**:
  - `NODE_VERSION`: `18`
  - `ENVIRONMENT`: `production`

### Preview Deployments

- **Branch**: `development`
- **Build command**: `bash cloudflare/build.sh`
- **Environment variables**:
  - `ENVIRONMENT`: `development`

## Local Testing

To test the build process locally:

```bash
# Run the build script
bash cloudflare/build.sh

# Serve the dist directory to preview the minified site
npx http-server dist
```

## Notes

- Both production (main) and development branches will serve minified code
- Only local development uses unminified code
- The build script automatically installs required minification tools without modifying package.json 