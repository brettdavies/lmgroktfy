import { UIState } from '../managers/UIState.js';

/**
 * Handles the submission of a question to the Grok API
 * @async
 * @param {string} question - The question to submit to Grok
 * @returns {Promise<void>}
 * @throws {Error} When the API request fails or returns an error
 */
export async function handleQuestionSubmission(question) {
    console.log('[Form Submit] Question received:', question);
    
    if (!question) {
        console.log('[Validation] Empty question submitted, returning');
        return;
    }

    UIState.showLoading();

    try {
        console.log('[API] Sending request to /api/grok');
        const response = await fetch('/api/grok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });

        console.log('[API] Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        UIState.hideLoading();
        
        if (data.error) {
            console.error('[Error Handler] API returned error:', data.error);
            UIState.showError();
        } else {
            console.log('[Success] Displaying response and buttons');
            UIState.showSuccess(data.answer, question);
            const encodedQuestion = encodeURIComponent(question);
            window.history.replaceState({}, '', '/' + encodedQuestion);
        }
    } catch (error) {
        console.error('[Error Handler] Caught error:', error.message, error.stack);
        UIState.hideLoading();
        UIState.showError();
    }
} 