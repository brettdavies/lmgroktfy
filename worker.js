addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // Restrict to POST requests at /api/grok
    if (request.method !== 'POST' || !request.url.endsWith('/api/grok')) {
        return new Response('Not Found', { status: 404 });
    }

    // Define allowed referring domains
    const allowedDomains = [
        'lmgroktfy.com',
        'dev.lmgroktfy.com'
    ];

    // Check Referer header
    const referer = request.headers.get('Referer');
    const refererDomain = referer ? new URL(referer).hostname : null;
    console.log('[Security] Referer domain:', refererDomain);

    if (!refererDomain || !allowedDomains.includes(refererDomain)) {
        console.log('[Security] Access denied: Invalid or missing referer domain');
        return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Verify Cloudflare zone
    if (!request.cf || !allowedDomains.includes(request.cf.zoneName)) {
        console.log('[Security] Access denied: Invalid Cloudflare zone');
        return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body = await request.json();
        const question = body.question;
        const system_content = "You are Grok, created by xAI, providing concise, helpful, and accurate answers for the 'Let me Grok that for you' app."
        if (!question || typeof question !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Invalid or missing "question" in request body' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-2-1212",
                messages: [
                    {
                        role: "system",
                        content: system_content
                    },
                    {
                        role: "user",
                        content: question
                    }
                ],
                stream: false,
                temperature: 0
            })
        });

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            return new Response(
                JSON.stringify({ error: `xAI API error: ${apiResponse.status} - ${errorText}` }),
                { status: apiResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await apiResponse.json();
        const answer = data.choices[0]?.message?.content || 'No answer provided';
        const shareId = data.id || 'default-share-id';

        return new Response(
            JSON.stringify({ answer, shareId }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: `Server error: ${error.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
