# ChummerWeb

A modern web-based Shadowrun 4th Edition character generator and career manager.

## Features

- **Offline-First**: Works without internet connection via PWA
- **Cloud Sync**: Automatically syncs characters across devices
- **Chummer Compatible**: Import/export XML files from desktop Chummer
- **Character Sharing**: Share characters via links or with specific users

## Tech Stack

- **Frontend**: SvelteKit 2, TypeScript
- **Styling**: TailwindCSS with custom cyberpunk design system
- **Backend**: Firebase (Auth, Firestore)
- **Testing**: Vitest, Playwright

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/HalfBakedFullyNuts/ChummerGenSR4.git
   cd ChummerGenSR4/chummer-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your Firebase configuration in `.env`

5. Start the development server:
   ```bash
   npm run dev
   ```

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication with Google provider
3. Create a Firestore database
4. Copy your web app config to `.env`

## Development

```bash
# Start dev server
npm run dev

# Type checking
npm run check

# Run tests
npm run test

# Build for production
npm run build
```

## Project Structure

```
chummer-web/
├── src/
│   ├── lib/
│   │   ├── components/    # Svelte components
│   │   ├── stores/        # Svelte stores
│   │   ├── engine/        # Rules engine
│   │   ├── firebase/      # Firebase integration
│   │   ├── types/         # TypeScript definitions
│   │   ├── xml/           # Chummer XML import/export
│   │   └── styles/        # Design system CSS
│   ├── routes/            # SvelteKit routes
│   └── app.css            # Global styles
├── static/
│   └── data/              # Game data (JSON)
├── scripts/               # Build scripts
└── tests/                 # Test files
```

## Code Quality

This project follows strict code quality rules:

- Functions max 60 lines
- Minimum 2 assertions per function
- All loops have fixed upper bounds
- No dynamic memory allocation after init
- Strict TypeScript mode enabled

See `docs/REQUIREMENTS.md` for full specifications.

## License

This is a fan project for Shadowrun 4th Edition. Shadowrun is a registered trademark of The Topps Company, Inc.
