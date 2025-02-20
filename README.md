# lmgroktfy-worker - Let me Grok that for you API

This Worker powers the "Let me Grok that for you" web app, a modern, lightweight version of "Let me Google that for you," leveraging xAI’s Grok AI to provide concise, witty answers to user questions. It handles API requests, integrates with the xAI API, and returns responses formatted for the app.

## Overview

The Worker (`lmgroktfy-worker`) is deployed via Cloudflare Workers and hosted on GitHub. It listens for POST requests at `/api/grok`, processes user questions, and forwards them to the xAI API (using the `grok-2-1212` model) to generate responses. Each response starts with a promotional message to encourage sharing: “Thanks for letting me GROK that for you. Share `https://lmgroktfy.com` with your friends,” followed by the answer and a shareable conversation ID.

## Features

- Accepts JSON POST requests with a `question` field (e.g., `{"question": "What is the capital of France?"}`).
- Integrates with xAI’s API using the `grok-2-1212` model.
- Returns responses in JSON format: `{"answer": "...", "shareId": "..."}`.
- Includes a system message to ensure consistent, branded responses.
- Scalable and lightweight, leveraging Cloudflare’s edge network for high bandwidth.

## Prerequisites

- A Cloudflare account with Workers enabled.
- GitHub account for repository management.
- xAI API key (stored securely as an environment variable in Cloudflare).

## Setup

### Repository Structure

- **Root**: Contains `worker.js` (the Worker script).
- **Branch**: `worker` (used for deployment).

### Environment Variables

The Worker requires an `API_KEY` environment variable for xAI API authentication:

1. In the Cloudflare dashboard:
   - Go to **Workers & Pages** > `lmgroktfy-worker` > **Settings** > **Variables**.
   - Add `API_KEY` with your xAI API key (e.g., `xai-[redacted]`).

### Dependencies

No external dependencies are required; the Worker uses native JavaScript and Cloudflare’s `fetch` API.

## Deployment

This Worker is deployed via GitHub commits to the `worker` branch of the `lmgroktfy` repository.

### Steps

1. Clone or Update the Repository:

   ```bash
   git clone https://github.com/your-username/lmgroktfy.git
   cd lmgroktfy
   git checkout worker
   ```

2. Modify `worker.js`:

   - Update `worker.js` as needed (e.g., adjust the `system` message or API endpoint).
   - Commit changes:

        ```bash
        git add worker.js
        git commit -m "Update Worker script"
        git push origin worker
        ```

3. Connect to Cloudflare:

   - In the Cloudflare dashboard:
     - Go to Workers & Pages > Create Application > Workers (or edit `lmgroktfy-worker`).
     - Select Deploy with GitHub, authorize access, and connect to the `lmgroktfy` repository.
     - Set the branch to `worker` and name the Worker `lmgroktfy-worker`.
   - Save and deploy.

4. Configure Routes:

   - Ensure the following routes are set in Triggers > Routes:
     - `lmgroktfy.com/api/grok`
     - `dev.lmgroktfy.com/api/grok`
   - Verify DNS records for `lmgroktfy.com` and `dev.lmgroktfy.com` are proxied (orange cloud) in Cloudflare.

5. Optional: Enable `workers.dev`

To use `lmgroktfy-worker.davies-brett.workers.dev/api/grok` for testing, enable it in Settings > Domains & Routes.

## Usage

### API Endpoint

- URL: `https://lmgroktfy.com/api/grok` or `https://dev.lmgroktfy.com/api/grok`

- Method: `POST`

- Request Body (JSON):

    ```json
    {
        "question": "What is the capital of France?"
    }

- Response Body (JSON):

    ```json
    {
        "answer": "Thanks for letting me GROK that for you. Share https://lmgroktfy.com with your friends\nThe capital of France is Paris.",
        "shareId": "some-id"
    }
    ```

- Headers:
  - `Content-Type: application/json`

### Example Request

Using `curl`:

```bash
curl -X POST https://dev.lmgroktfy.com/api/grok \
    -H "Content-Type: application/json" \
    -d '{"question": "What is the capital of France?"}'
```

### Testing

- Use the `workers.dev` URL (`https://lmgroktfy-worker.davies-brett.workers.dev/api/grok`) for development testing if enabled.
- Monitor logs in the Cloudflare dashboard or with:

    ```bash
    wrangler tail --name lmgroktfy-worker
    ```

## Configuration

### `worker.js`

The Worker script (`worker.js`) handles:

- Request validation.
- xAI API integration with grok-2-1212.
- Response formatting with the promotional prefix.

Key settings:

- Model: `grok-2-1212`
- System Message: `"You are Grok, created by xAI, providing concise, helpful, and witty answers for the 'Let me Grok that for you' app. For every user question, start your response with 'Thanks for letting me GROK that for you. Share https://lmgroktfy.com with your friends' followed by a single newline, then provide the answer to the question."`
- API Endpoint: `https://api.x.ai/v1/chat/completions`
- Parameters: `stream: false`, `temperature: 0`

### Contributing

- Fork the repository.
- Create a branch for your changes:

    ```bash
    git checkout -b feature/your-feature
    ```

- Commit changes and push to the worker branch:

    ```bash
    git push origin worker
    ```

- Submit a pull request for review.

### License

This project is licensed under the MIT License - see the LICENSE file for details (if applicable).

### Support

For issues or questions, open an issue in the GitHub repository or contact support via the Cloudflare dashboard for lmgroktfy-worker.

### Notes

- Replace your-username in the GitHub URL with your actual GitHub username.
- If you don’t have a LICENSE file, remove the reference or add one as needed.
- The README assumes your static site (“Let me Grok that for you”) is hosted separately and calls this Worker’s API.
