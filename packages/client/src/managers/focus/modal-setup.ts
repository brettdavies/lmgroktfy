import { addClass, show } from '../../ui';
import { trapFocus } from './trap';

/**
 * Modal focus trigger setup.
 */

export function setupModalFocusTraps(): void {
  document.addEventListener('click', handleModalTriggerClick);
}

function handleModalTriggerClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const modalTrigger = target.closest<HTMLElement>('[data-opens-modal]');
  if (!modalTrigger) return;

  const modalId = modalTrigger.dataset.opensModal;
  if (!modalId) return;

  const modal = document.getElementById(modalId);
  if (modal) {
    if (modal.tagName === 'DIALOG') {
      (modal as HTMLDialogElement).showModal();
    } else {
      show(modal);
      addClass(modal, 'active');
    }
    trapFocus(modal);
  }
}
