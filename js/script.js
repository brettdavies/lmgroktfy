document.getElementById('question-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const question = document.getElementById('question-input').value;
    console.log('[Form Submit] Question received:', question);
    
    if (!question) {
        console.log('[Validation] Empty question submitted, returning');
        return;
    }

    // Show loading state
    console.log('[UI] Showing loading state');
    document.getElementById('loading').style.display = 'block';
    document.getElementById('response').style.display = 'none';

    // Call the Cloudflare Worker endpoint
    console.log('[API] Sending request to /api/grok');
    fetch('/api/grok', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: question })
    })
    .then(response => {
        console.log('[API] Response received:', response);
        console.log('[API] Response received, status:', response.status);
        if (!response.ok) {
            console.error('[API] Response not OK:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('[API] Data parsed successfully:', { 
            hasError: !!data.error, 
            hasShareId: !!data.shareId 
        });
        
        // Hide loading state
        document.getElementById('loading').style.display = 'none';

        if (data.error) {
            console.error('[Error Handler] API returned error:', data.error);
            document.getElementById('answer').innerText = 'Oops, something went wrong!';
            document.getElementById('continue-link').style.display = 'none';
        } else {
            console.log('[Success] Displaying response and share link');
            document.getElementById('answer').innerText = data.answer;
            document.getElementById('continue-link').href = `https://x.com/i/grok?text=${question}`;   
            document.getElementById('continue-link').style.display = 'inline-block';
        }
        document.getElementById('response').style.display = 'block';
        document.getElementById('question-form').style.display = 'none';
    })
    .catch(error => {
        console.error('[Error Handler] Caught error:', error.message, error.stack);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('answer').innerText = 'Oops, something went wrong!';
        document.getElementById('continue-link').style.display = 'none';
        document.getElementById('response').style.display = 'block';
    });
});
