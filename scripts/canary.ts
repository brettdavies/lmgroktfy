/**
 * Nightly production canary. Silent on success (exit 0). On any failure it
 * prints what broke and exits non-zero, so the scheduled GitHub Action turns
 * red and GitHub sends its native failure notification; a green run notifies
 * nobody.
 *
 * Two checks:
 *   1. the production site responds (the Worker is serving),
 *   2. a direct xAI call with the production key and the app's pinned model
 *      still returns a real answer (the key is valid and the model responds).
 *
 * The /api/grok endpoint itself is Turnstile-gated, so a bot cannot exercise it
 * end-to-end; the direct xAI call stands in for "the model still answers". It
 * reuses @lmgroktfy/shared, so it always tests whatever model the app ships.
 */
import { GROK_API, HEADERS } from '@lmgroktfy/shared';

const SITE = process.env.CANARY_SITE_URL ?? 'https://lmgroktfy.com';
const XAI_TIMEOUT_MS = 30_000;

// A pool of innocuous factual prompts; one is picked at random each run so the
// canary is not a single memorizable request.
const QUESTIONS = [
  'what is the speed of light',
  'who wrote hamlet',
  'when did the first moon landing happen',
  'what is the boiling point of water at sea level',
  'how many continents are there',
  'what is the capital of japan',
  'what year did the berlin wall fall',
  'summarize photosynthesis in one sentence',
];

const failures: string[] = [];
const ok = (m: string): void => console.log(`canary: ${m}`);
const errMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

async function checkSiteUp(): Promise<void> {
  try {
    const res = await fetch(SITE, { headers: { 'User-Agent': 'lmgroktfy-canary' } });
    if (res.ok) ok(`site up (${res.status})`);
    else failures.push(`site GET ${SITE} -> HTTP ${res.status}`);
  } catch (e) {
    failures.push(`site GET ${SITE} errored: ${errMessage(e)}`);
  }
}

async function checkXai(): Promise<void> {
  const apiKey = process.env.CANARY_XAI_API_KEY;
  if (!apiKey) {
    failures.push('CANARY_XAI_API_KEY is not set');
    return;
  }
  const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), XAI_TIMEOUT_MS);
  try {
    const res = await fetch(GROK_API.URL, {
      method: 'POST',
      headers: {
        [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
        [HEADERS.AUTHORIZATION]: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROK_API.MODEL,
        messages: [
          { role: 'system', content: GROK_API.SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        stream: GROK_API.STREAM,
        temperature: GROK_API.TEMPERATURE,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      failures.push(`xAI ${GROK_API.MODEL} -> HTTP ${res.status} ${body.slice(0, 200)}`);
      return;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer === 'string' && answer.trim()) {
      ok(`xAI ${GROK_API.MODEL} answered "${question}" (${answer.trim().length} chars)`);
    } else {
      failures.push(`xAI ${GROK_API.MODEL} returned no answer for "${question}"`);
    }
  } catch (e) {
    const reason = controller.signal.aborted
      ? `timed out after ${XAI_TIMEOUT_MS}ms`
      : `errored: ${errMessage(e)}`;
    failures.push(`xAI ${GROK_API.MODEL} ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

await checkSiteUp();
await checkXai();

if (failures.length > 0) {
  console.error(`\nCANARY FAILED (${failures.length}):`);
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}
ok('all checks passed');
