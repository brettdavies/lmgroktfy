# LMGROKTFY (Let Me GROK That For You)

> **Project Overview:** See [PROJECT.md](PROJECT.md) for a high-level overview, achievements, and technical highlights.

A simple, accessible web application that allows users to submit questions to the Grok AI and share the answers.

## Features

- Submit questions to Grok AI and view responses
- Copy answers or question-answer pairs for sharing
- Share links directly to specific questions and answers
- Toggle between light and dark themes
- Fully accessible interface with keyboard navigation and screen reader support

## Accessibility Features

### ARIA Live Regions

- Dynamic content updates are announced to screen readers
- Loading states use `aria-live="polite"` to inform users of progress
- Toast notifications use `aria-live="assertive"` for important updates

### Keyboard Navigation

- Full keyboard navigation throughout the application
- Focus management for modal dialogs
- Focus trapping within modals for improved usability
- Automatic focus on interactive elements in the response area

### Keyboard Shortcuts

#### General

- `/` or `?` - Focus the search input
- `h` - Open the help modal
- `t` - Toggle between light and dark themes
- `Esc` - Close any open modal

#### When Answer is Displayed

- `c` - Copy the answer
- `q` - Copy the question and answer
- `s` - Copy the share link
- `g` - Continue on Grok

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure the API endpoint (see below)
4. Start the development server: `npm run serve`

### API Configuration

For development with the team's API endpoint:

1. Create a `config.local.json` file in the project root (this file is gitignored)
2. Add the following content, replacing the example URL with the actual development API endpoint:

   ```json
   {
     "apiBaseUrl": "https://development-api-domain.com",
     "debugMode": true
   }
   ```

3. The application will automatically use this API endpoint when running locally
4. In production, the application uses relative URLs by default (`/api/grok`)

> **Note**: The development API endpoint is confidential and should not be committed to the repository or shared publicly. Contact a team member to get the correct endpoint URL.

#### CORS Requirements

When working with the development API:

- **HTTPS is required**: The API endpoint must use HTTPS to avoid mixed-content issues
- **CORS support**: The API server must allow cross-origin requests from your local development server
- **Troubleshooting**: If you encounter CORS errors, ensure the API server includes the following headers in its responses:
  ```
  Access-Control-Allow-Origin: http://localhost:8080
  Access-Control-Allow-Methods: POST, OPTIONS
  Access-Control-Allow-Headers: Content-Type
  ```

### Testing

- Run unit tests: `npm test`
- Run end-to-end tests: `npm run test:e2e`

## Deployment

This project is deployed using Cloudflare Pages, which automatically minifies all assets for production.

### Deployment Process

1. Development is done on the `development` branch with unminified code for easier debugging
2. When code is pushed to either the `development` or `main` branch, Cloudflare Pages:
   - Runs the build script located at `cloudflare/build.sh`
   - Minifies all JavaScript, CSS, and HTML files
   - Deploys the minified code to Cloudflare's global CDN

### Cloudflare Pages Configuration

The Cloudflare Pages configuration is documented in `cloudflare/cloudflare-pages.json` and includes:
- Build command: `bash cloudflare/build.sh`
- Output directory: `dist`
- Environment variables for both production and preview deployments

For more details on the deployment configuration, see the [Cloudflare Pages documentation](cloudflare/README.md).

### Local Testing of Production Build

To test the minified production build locally:

```bash
# Run the build script
bash cloudflare/build.sh

# Serve the dist directory to preview the minified site
npx http-server dist
```