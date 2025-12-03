import { copyText, getShareableText } from '../managers';
import { elements } from '../ui';

/**
 * Sets up all copy and share button handlers.
 */
export function setupCopyButtons(): void {
  setupCopyQAButton();
  setupCopyAnswerButton();
  setupShareButton();
  setupShareOnXButton();
}

function setupCopyQAButton(): void {
  const button = elements.buttons.copyQA();
  if (!button) return;

  button.addEventListener('click', () => {
    copyText(getShareableText('qa'), 'copy_qa');
  });
}

function setupCopyAnswerButton(): void {
  const button = elements.buttons.copyAnswer();
  if (!button) return;

  button.addEventListener('click', () => {
    copyText(getShareableText('answer'), 'copy_answer');
  });
}

function setupShareButton(): void {
  const button = elements.buttons.share();
  if (!button) return;

  button.addEventListener('click', () => {
    copyText(getShareableText('url'), 'copy_link');
  });
}

function setupShareOnXButton(): void {
  const button = elements.buttons.shareOnX();
  if (!button) return;

  button.addEventListener('click', () => {
    const tweetText = getShareableText('tweet');
    const shareUrl = getShareableText('shareUrl');
    window.open(`https://x.com/intent/tweet?text=${tweetText}&url=${shareUrl}`, '_blank');
  });
}
