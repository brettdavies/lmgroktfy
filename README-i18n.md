# Localization (i18n) for LMGROKTFY

This document describes the localization (internationalization/i18n) system implemented for the LMGROKTFY project.

## Overview

The localization system allows the website to be displayed in multiple languages. It uses a simple, lightweight approach with JSON translation files and JavaScript to dynamically update the content based on the user's preferred language.

## Features

- Automatic language detection based on browser settings
- Language persistence using localStorage
- Language switcher UI component
- Support for HTML content in translations
- Lazy loading of translations for performance optimization
- RTL language support

## Directory Structure

```
├── js/
│   ├── i18n/
│   │   ├── i18n.js             # Core localization module
│   │   └── language-detector.js # Language detection utilities
│   └── main.js                 # Main JS file that initializes i18n
├── locales/
│   ├── en.json                 # English translations
│   ├── es.json                 # Spanish translations
│   ├── fr.json                 # French translations (to be added)
│   ├── de.json                 # German translations (to be added)
│   └── ja.json                 # Japanese translations (to be added)
├── css/
│   └── i18n.css                # Styles for language switcher and RTL support
└── tests/
    └── i18n/
        ├── i18n.test.js        # Unit tests for i18n module
        └── integration.test.js # Integration tests for i18n
```

## How to Use

### Adding Translatable Content

1. Add the `data-i18n` attribute to any HTML element that needs to be translated:

```html
<h1 data-i18n="main.title">Let me Grok that for you</h1>
```

2. Add the corresponding translation key to the translation files:

```json
{
  "main": {
    "title": "Let me Grok that for you"
  }
}
```

### Adding a New Language

1. Create a new JSON file in the `locales` directory (e.g., `fr.json` for French)
2. Copy the structure from an existing translation file (e.g., `en.json`)
3. Translate all the values (keeping the keys the same)
4. Add the language to the supported languages list in `js/main.js`:

```js
supportedLanguages: ['en', 'es', 'fr', 'de', 'ja'],
```

5. Add the language option to the language switcher in `index.html`:

```html
<option value="fr">🇫🇷 FR</option>
```

### RTL Language Support

For right-to-left (RTL) languages like Arabic or Hebrew:

1. The system automatically sets the `dir="rtl"` attribute on the HTML element when an RTL language is detected
2. CSS styles in `i18n.css` handle the RTL layout adjustments

## Implementation Details

### Core Components

1. **I18n Class** (`js/i18n/i18n.js`): The main class that handles loading translations and updating the DOM
2. **Language Detector** (`js/i18n/language-detector.js`): Utilities for detecting the user's preferred language
3. **Main JS** (`js/main.js`): Initializes the i18n system with configuration options

### Initialization Process

1. The system detects the user's preferred language
2. It loads the corresponding translation file
3. It updates all elements with `data-i18n` attributes
4. It sets up the language switcher event listener

### Performance Considerations

- Translations are loaded on demand
- Only one language file is loaded at a time
- The system uses an Intersection Observer for lazy loading translations
- HTML content is cached to minimize DOM manipulations

## Testing

Unit and integration tests are provided in the `tests/i18n` directory:

- `i18n.test.js`: Tests for the core i18n functionality
- `integration.test.js`: Tests for the integration with the DOM

Run tests with:

```
npm test
```

## Future Improvements

- Add more languages
- Implement region-specific variations (e.g., en-US, en-GB)
- Add support for pluralization
- Implement date and number formatting based on locale
- Add a translation management system for easier updates 