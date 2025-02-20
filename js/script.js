document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    console.log('[Page Load] URL pathname:', path);

    if (path && path !== '/' && path !== '/index.html') {
        // Extract the question from the path, removing leading slash and trailing query/fragments
        let question = path.replace(/^\//, '').replace(/\?.*$/, '').trim();
        console.log('[Page Load] Extracted question from path:', question);

        if (question) {
            // Automatically submit the question
            handleQuestionSubmission(question);
            // Optionally, pre-fill the input for user reference
            document.getElementById('question-input').value = question;
        }
    }
});

function handleQuestionSubmission(question) {
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
            document.getElementById('copy-answer-button').style.display = 'none';
        } else {
            console.log('[Success] Displaying response and buttons');
            document.getElementById('answer').innerText = data.answer;
            document.getElementById('continue-link').href = `https://grok.com/?q=${encodeURIComponent(question)}`;
            document.getElementById('continue-link').style.display = 'inline-block';
            document.getElementById('share-button').style.display = 'inline-block';
            document.getElementById('copy-answer-button').style.display = 'inline-block';
        }
        document.getElementById('response').style.display = 'block';
        document.getElementById('question-form').style.display = 'none';

        // Update the URL with the encoded question
        const encodedQuestion = encodeURIComponent(question);
        window.history.replaceState({}, '', '/' + encodedQuestion);
    })
    .catch(error => {
        console.error('[Error Handler] Caught error:', error.message, error.stack);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('answer').innerText = 'Oops, something went wrong!';
        document.getElementById('continue-link').style.display = 'none';
        document.getElementById('share-button').style.display = 'none';
        document.getElementById('copy-answer-button').style.display = 'none';
        document.getElementById('response').style.display = 'block';
    });
}

// Handle form submission
document.getElementById('question-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const question = document.getElementById('question-input').value;
    handleQuestionSubmission(question);
});

// Add click handler for the copy question and answer button
document.getElementById('copy-question-answer-button').addEventListener('click', function() {
    const questionText = document.getElementById('question-input').value;
    const answerText = document.getElementById('answer').innerText;
    const textToCopy = 'Question: ' + questionText + ' - Answer: ' + answerText + ' - Answer by Grok via lmgroktfy.com';
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('[Copy Answer] Text copied to clipboard:', textToCopy);
        })
        .catch(err => {
            console.error('[Copy Answer] Failed to copy text:', err);
            alert('Failed to copy answer. Please try again.');
        });
});

// Add click handler for the copy answer button
document.getElementById('copy-answer-button').addEventListener('click', function() {
    const answerText = document.getElementById('answer').innerText;
    const textToCopy = answerText + ' - Answer by Grok via lmgroktfy.com';
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('[Copy Answer] Text copied to clipboard:', textToCopy);
        })
        .catch(err => {
            console.error('[Copy Answer] Failed to copy text:', err);
            alert('Failed to copy answer. Please try again.');
        });
});

// Add click handler for the share button
document.getElementById('share-button').addEventListener('click', function() {
    const textToCopy = window.location.href;
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('[Share] URL copied to clipboard:', textToCopy);
        })
        .catch(err => {
            console.error('[Share] Failed to copy URL:', err);
            alert('Failed to copy URL. Please try again.');
        });
});
