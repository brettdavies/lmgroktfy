# LMGROKTFY (Let Me GROK That For You)

A simple, accessible web application that allows users to submit questions to the Grok AI and share the answers.

## Features

- Submit questions to Grok AI and view responses
- Copy answers or question-answer pairs for sharing
- Share links directly to specific questions and answers
- Toggle between light and dark themes
- Fully accessible interface with keyboard navigation and screen reader support

## Accessibility Features

### ARIA Live Regions

- Dynamic content updates are announced to screen readers
- Loading states use `aria-live="polite"` to inform users of progress
- Toast notifications use `aria-live="assertive"` for important updates

### Keyboard Navigation

- Full keyboard navigation throughout the application
- Focus management for modal dialogs
- Focus trapping within modals for improved usability
- Automatic focus on interactive elements in the response area

### Keyboard Shortcuts

#### General

- `/` or `?` - Focus the search input
- `h` - Open the help modal
- `t` - Toggle between light and dark themes
- `Esc` - Close any open modal

#### When Answer is Displayed

- `c` - Copy the answer
- `q` - Copy the question and answer
- `s` - Copy the share link
- `g` - Continue on Grok

## Development

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

### Testing

- Run unit tests: `npm test`
- Run end-to-end tests: `npm run test:e2e`
- Run specific browser tests: `npm run test:e2e -- --project=chromium`

### Code Structure

- `js/` - JavaScript modules and managers
- `css/` - Stylesheets
- `tests/` - Unit and end-to-end tests

## Browser Support

- Chrome/Chromium
- Firefox
- Safari
- Mobile browsers (Chrome, Safari)

## License

[MIT License](LICENSE)
