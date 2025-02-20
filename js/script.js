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
            document.getElementById('share-button').style.display = 'none';
        } else {
            console.log('[Success] Displaying response and buttons');
            document.getElementById('answer').innerText = data.answer;
            // Update to link to X with the question (encoded for URL safety)
            document.getElementById('continue-link').href = `https://x.com/i/grok?text=${encodeURIComponent(question)}`;
            document.getElementById('continue-link').style.display = 'inline-block';
            document.getElementById('share-button').style.display = 'inline-block';
        }
        document.getElementById('response').style.display = 'block';
        document.getElementById('question-form').style.display = 'none';
    })
    .catch(error => {
        console.error('[Error Handler] Caught error:', error.message, error.stack);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('answer').innerText = 'Oops, something went wrong!';
        document.getElementById('continue-link').style.display = 'none';
        document.getElementById('share-button').style.display = 'none';
        document.getElementById('response').style.display = 'block';
    });

    // Add click handler for the share button
    document.getElementById('share-button').addEventListener('click', function() {
        const textToCopy = 'lmgroktfy.com is great, check it out';
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                console.log('[Share] Text copied to clipboard:', textToCopy);
                // Removed alert; browser may show a native tooltip
            })
            .catch(err => {
                console.error('[Share] Failed to copy text:', err);
                alert('Failed to copy text. Please try again.');
                // Keep alert for errors to inform users
            });
    });
});
