import { getPlaceholders, useTranslations } from '../i18n';

// The rendered HTML embeds markup inside a couple of catalog strings (e.g. a
// `<span>` around "Grok" in the title); the markdown twin needs the plain text.
function stripMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}

/**
 * Renders the markdown twin of the home page for a locale. Pulls from the same
 * catalog and translator the rendered HTML uses, so the twin can't drift from
 * the localized page it mirrors.
 */
export function renderHomeTwin(locale: string): string {
  const t = useTranslations(locale);
  const example = getPlaceholders(locale)[0] ?? t('main.placeholder');

  return `# ${stripMarkup(t('main.title'))}

> ${example}

${t('help.description')}

## ${t('help.protips.title')}

- ${t('help.protips.url')} \`lmgroktfy.com/Your Question Here\`
- ${t('help.protips.share')}
- ${t('help.protips.copy')}

## ${t('help.shortcuts.title')}

### ${t('help.shortcuts.general')}

- \`/\` - ${t('help.shortcuts.focus')}
- \`?\` / \`h\` - ${t('help.shortcuts.help')}
- \`t\` - ${t('help.shortcuts.theme')}
- \`Esc\` - ${t('help.shortcuts.close')}

### ${t('help.shortcuts.answer')}

- \`c\` - ${t('help.shortcuts.copy_answer')}
- \`q\` - ${t('help.shortcuts.copy_qa')}
- \`s\` - ${t('help.shortcuts.copy_link')}
- \`g\` - ${t('help.shortcuts.continue')}

---

${t('footer.disclaimer')}

${t('footer.copyright')}
`;
}
