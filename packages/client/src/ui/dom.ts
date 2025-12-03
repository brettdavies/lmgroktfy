import { CSS_CLASSES } from '@lmgroktfy/shared';

/**
 * Generic DOM manipulation operations.
 * Low-level utilities for showing, hiding, and modifying elements.
 */

export function show(element: HTMLElement | null): void {
  if (element) element.classList.remove(CSS_CLASSES.HIDDEN);
}

export function hide(element: HTMLElement | null): void {
  if (element) element.classList.add(CSS_CLASSES.HIDDEN);
}

export function setOpacity(element: HTMLElement | null, value: number): void {
  if (element) element.style.opacity = value.toString();
}

export function setText(element: HTMLElement | null, text: string): void {
  if (element) element.textContent = text;
}

export function setHtml(element: HTMLElement | null, html: string): void {
  if (element) element.innerHTML = html;
}

export function addClass(element: HTMLElement | null, className: string): void {
  if (element) element.classList.add(className);
}

export function removeClass(element: HTMLElement | null, className: string): void {
  if (element) element.classList.remove(className);
}

export function toggleClass(element: HTMLElement | null, className: string, force?: boolean): void {
  if (element) element.classList.toggle(className, force);
}

export function setAttribute(element: HTMLElement | null, name: string, value: string): void {
  if (element) element.setAttribute(name, value);
}

export function removeAttribute(element: HTMLElement | null, name: string): void {
  if (element) element.removeAttribute(name);
}

export function setStyle(element: HTMLElement | null, property: string, value: string): void {
  if (element) element.style.setProperty(property, value);
}

export function removeStyle(element: HTMLElement | null, property: string): void {
  if (element) element.style.removeProperty(property);
}

export function enableButton(button: HTMLButtonElement | null): void {
  if (button) button.disabled = false;
}

export function disableButton(button: HTMLButtonElement | null): void {
  if (button) button.disabled = true;
}
