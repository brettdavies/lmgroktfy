document.getElementById('question-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const question = document.getElementById('question-input').value;
    if (!question) return;

    // Show loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('response').style.display = 'none';

    // Make API call (replace with actual endpoint and headers)
    fetch('https://api.xai.example/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add your API key or authentication here, e.g.:
            // 'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({ question: question })
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading
        document.getElementById('loading').style.display = 'none';

        if (data.error) {
            // Show error
            document.getElementById('answer').innerText = 'Oops, something went wrong!';
            document.getElementById('continue-link').style.display = 'none';
        } else {
            // Show response
            document.getElementById('answer').innerText = data.answer;
            document.getElementById('continue-link').href = `https://grok.com/share/${data.shareId}`;
            document.getElementById('continue-link').style.display = 'inline-block';
        }
        document.getElementById('response').style.display = 'block';
        // Hide the form
        document.getElementById('question-form').style.display = 'none';
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('answer').innerText = 'Oops, something went wrong!';
        document.getElementById('continue-link').style.display = 'none';
        document.getElementById('response').style.display = 'block';
    });
});
