/**
 * Language switcher initialization.
 */

export function initLanguageSwitcher(
  selector: string,
  currentLanguage: string,
  onLanguageChange: (language: string) => void
): void {
  const switcher = document.querySelector<HTMLSelectElement>(selector);

  if (!switcher) {
    return;
  }

  if (switcher.tagName === 'SELECT') {
    const optionExists = Array.from(switcher.options).some(
      (option) => option.value === currentLanguage
    );
    if (optionExists) {
      switcher.value = currentLanguage;
    }
  }

  switcher.addEventListener('change', (event) => {
    const target = event.target as HTMLSelectElement;
    onLanguageChange(target.value);
  });
}
