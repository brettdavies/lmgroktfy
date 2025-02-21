document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    console.log('[Page Load] URL pathname:', path);

    if (path && path !== '/' && path !== '/index.html') {
        let question = path.replace(/^\//, '').replace(/\?.*$/, '').trim();
        console.log('[Page Load] Extracted question from path:', question);

        if (question) {
            handleQuestionSubmission(question);
            document.getElementById('question-input').value = question;
            question_encoded = encodeURIComponent(question);
        }
    }

    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');
    
    function updateThemeIcon(theme) {
        themeIcon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }

    themeToggle.addEventListener('click', function() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Initialize theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // Modal functionality
    const modal = document.getElementById('help-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const helpButton = document.getElementById('help-button');
    const closeButton = modal.querySelector('.modal-close');

    function showModal() {
        modal.style.display = 'block';
        modalBackdrop.style.display = 'block';
        modal.classList.add('fade-in');
        modalBackdrop.classList.add('fade-in');
    }

    function hideModal() {
        modal.style.display = 'none';
        modalBackdrop.style.display = 'none';
        modal.classList.remove('fade-in');
        modalBackdrop.classList.remove('fade-in');
    }

    helpButton.addEventListener('click', showModal);
    closeButton.addEventListener('click', hideModal);
    modalBackdrop.addEventListener('click', hideModal);

    // Toast functionality
    function showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 1000);
    }

    // Update Grok buttons when showing response
    function updateGrokButtons(question) {
        const encodedQuestion = encodeURIComponent(question);
        document.getElementById('continue-link').href = `https://grok.com/?q=${encodedQuestion}`;
        document.getElementById('use-grok-button').href = `https://x.com/i/grok?text=${encodedQuestion}`;
    }
});

function handleQuestionSubmission(question) {
    console.log('[Form Submit] Question received:', question);
    
    if (!question) {
        console.log('[Validation] Empty question submitted, returning');
        return;
    }

    console.log('[UI] Showing loading state');
    document.getElementById('loading').style.display = 'block';
    document.getElementById('response').style.display = 'none';

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
        console.log('[API] Response status:', response.status);
        if (!response.ok) {
            console.error('[API] Response not OK:', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('[API] Data parsed:', { hasError: !!data.error, hasShareId: !!data.shareId });
        document.getElementById('loading').style.display = 'none';

        if (data.error) {
            console.error('[Error Handler] API returned error:', data.error);
            document.getElementById('answer').innerText = 'Oops, something went wrong!';
            document.getElementById('continue-link').style.display = 'none';
            document.getElementById('use-grok-button').style.display = 'none';
            document.getElementById('share-button').style.display = 'none';
            document.getElementById('copy-question-answer-button').style.display = 'none';
            document.getElementById('copy-answer-button').style.display = 'none';
            document.getElementById('share-on-x-button').style.display = 'none';
        } else {
            console.log('[Success] Displaying response and buttons');
            document.getElementById('answer').innerText = data.answer;
            updateGrokButtons(question);
            document.getElementById('continue-link').style.display = 'inline-block';
            document.getElementById('use-grok-button').style.display = 'inline-block';
            document.getElementById('share-button').style.display = 'inline-block';
            document.getElementById('copy-question-answer-button').style.display = 'inline-block';
            document.getElementById('copy-answer-button').style.display = 'inline-block';
            document.getElementById('share-on-x-button').style.display = 'inline-block';
        }
        document.getElementById('response').style.display = 'block';
        document.getElementById('question-form').style.display = 'none';

        const encodedQuestion = encodeURIComponent(question);
        window.history.replaceState({}, '', '/' + encodedQuestion);
    })
    .catch(error => {
        console.error('[Error Handler] Caught error:', error.message, error.stack);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('answer').innerText = 'Oops, something went wrong!';
        document.getElementById('continue-link').style.display = 'none';
        document.getElementById('use-grok-button').style.display = 'none';
        document.getElementById('share-button').style.display = 'none';
        document.getElementById('copy-answer-button').style.display = 'none';
        document.getElementById('share-on-x-button').style.display = 'none';
        document.getElementById('response').style.display = 'block';
    });
}

document.getElementById('question-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const question = document.getElementById('question-input').value;
    handleQuestionSubmission(question);
});

document.getElementById('copy-question-answer-button').addEventListener('click', function() {
    const questionText = document.getElementById('question-input').value;
    const answerText = document.getElementById('answer').innerText;
    const textToCopy = 'Question: ' + questionText + ' - Answer: ' + answerText + ' - Answer by Grok via lmgroktfy.com';
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('[Copy Q&A] Copied:', textToCopy);
            showToast('Question and answer copied!');
        })
        .catch(err => {
            console.error('[Copy Q&A] Copy failed:', err);
            alert('Failed to copy Q & A. Please try again.');
        });
});

document.getElementById('copy-answer-button').addEventListener('click', function() {
    const answerText = document.getElementById('answer').innerText;
    const textToCopy = answerText + ' - Answer by Grok via lmgroktfy.com';
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('[Copy Answer] Copied:', textToCopy);
            showToast('Answer copied!');
        })
        .catch(err => {
            console.error('[Copy Answer] Copy failed:', err);
            alert('Failed to copy answer. Please try again.');
        });
});

document.getElementById('share-button').addEventListener('click', function() {
    const textToCopy = window.location.href;
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            console.log('[Share] URL copied:', textToCopy);
            showToast('Share link copied!');
        })
        .catch(err => {
            console.error('[Share] Copy failed:', err);
            alert('Failed to copy URL. Please try again.');
        });
});

document.getElementById('share-on-x-button').addEventListener('click', function() {
    const question = document.getElementById('question-input').value;
    const shareUrl = window.location.href;
    const tweetText = 'Question: ' + questionText + ' - Answer: ' + answerText + ' - Answer by Grok via lmgroktfy.com';
    const tweetUrl = shareUrl;
    const xIntentUrl = `https://x.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;
    window.open(xIntentUrl, '_blank');
});
