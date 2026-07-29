import type { APIRoute, GetStaticPaths } from 'astro';
import { AGENT_DESCRIPTOR } from '../../lib/agent-descriptor';

// RFC 9116 security.txt. Canonical/Policy point at the file's own published
// location and the repo's GitHub security tab (valid even without a
// SECURITY.md, since GitHub always serves that tab).
const SECURITY_TXT = `Contact: mailto:security@lmgroktfy.com
Expires: 2027-07-28T00:00:00.000Z
Preferred-Languages: en
Canonical: https://lmgroktfy.com/.well-known/security.txt
Policy: https://github.com/brettdavies/lmgroktfy/security/policy
`;

const AGENT_DESCRIPTOR_JSON = `${JSON.stringify(AGENT_DESCRIPTOR, null, 2)}\n`;

// A single dispatcher keeps room for future RFC 8615 well-known resources
// without adding a new route file per entry.
const ROUTES: Record<string, { body: string; contentType: string }> = {
  'security.txt': { body: SECURITY_TXT, contentType: 'text/plain; charset=utf-8' },
  'agent.json': { body: AGENT_DESCRIPTOR_JSON, contentType: 'application/json; charset=utf-8' },
};

export const getStaticPaths: GetStaticPaths = () =>
  Object.keys(ROUTES).map((path) => ({ params: { path } }));

export const GET: APIRoute = ({ params }) => {
  const entry = params.path ? ROUTES[params.path] : undefined;

  if (!entry) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(entry.body, {
    status: 200,
    headers: { 'Content-Type': entry.contentType },
  });
};
