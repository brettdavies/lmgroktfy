export interface AgentCapability {
  readonly name: string;
  readonly description: string;
}

export interface AgentDescriptor {
  readonly name: string;
  readonly description: string;
  readonly homepage: string;
  readonly contact: string;
  readonly capabilities: readonly AgentCapability[];
}

// Describes the site's "ask Grok" capability for agents without publishing an
// endpoint, method, URL, or invocation schema (describe-not-expose): a
// documented paid endpoint invites scanner/bot abuse.
export const AGENT_DESCRIPTOR: AgentDescriptor = {
  name: 'lmgroktfy',
  description:
    'lmgroktfy lets a visitor ask a question in plain language and view an AI-generated answer from Grok, rendered on a shareable page.',
  homepage: 'https://lmgroktfy.com',
  contact: 'mailto:security@lmgroktfy.com',
  capabilities: [
    {
      name: 'ask-grok',
      description:
        'Submit a natural-language question through the site UI and receive a Grok-generated answer on a shareable page. This capability is UI-mediated, rate-limited, and challenge-protected; it is not published as a machine-callable API.',
    },
  ],
};
