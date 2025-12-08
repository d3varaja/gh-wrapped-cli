<div align="center">

# GitHub Wrapped 2025

**Your GitHub year in review, beautifully visualized in your terminal**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/gh-wrapped-2025)](https://www.npmjs.com/package/gh-wrapped-2025)

*Like Spotify Wrapped, but for developers*

[Quick Start](#quick-start) • [Features](#features) • [Demo](#demo) • [Token Setup](#github-token-setup) • [Contributing](#contributing)

</div>

---

## Demo

<div align="center">

![GitHub Wrapped Demo](.github/assets/demo.gif)

*Interactive terminal experience - from stats loading to image export*

</div>

---

## Quick Start

**No installation required.** Run it instantly:

```bash
# With Bun (recommended - fastest)
bunx gh-wrapped-2025

# With npm
npx gh-wrapped-2025
```

**Usage:**
1. Enter your GitHub username
2. Watch your stats load in real-time
3. Navigate with arrow keys / spacebar
4. Press `[E]` to export as image

> **Note:** Most users don't need a token. The app will only prompt you if you hit GitHub's rate limit (60 requests/hour).

## Features

### Comprehensive Analytics
- Total commits, PRs, issues, and code changes
- Contribution streaks (current & longest)
- Peak productivity hours
- Most active repository

### Language Insights
- Top 5 programming languages
- Usage percentages and visual breakdown
- Language-based statistics

### Developer Profile
- **Archetype Classification**: Night Owl, Early Bird, Weekend Warrior, etc.
- **Achievement System**: Unlock badges based on your activity
- **Smart Insights**: AI-generated observations about your coding patterns

### Export & Share
- Generate beautiful PNG images
- Optimized for social media sharing
- Background Chromium installation (seamless first-time setup)

### Privacy & Performance
- **100% Local Processing** - No data sent to external servers
- **Optimized API Calls** - Efficient GraphQL queries with caching
- **Optional Authentication** - Works without a token for most users

## Installation

### Run with bunx (Recommended - 100x faster!)
```bash
bunx gh-wrapped-2025
```
No installation needed! Just run it once and the app handles everything.

### Run with npx (Also works)
```bash
npx gh-wrapped-2025
```

### Install Globally
```bash
# With Bun
bun install -g gh-wrapped-2025
github-wrapped

# With npm
npm install -g gh-wrapped-2025
github-wrapped
```

### For Developers
```bash
git clone https://github.com/d3varaja/gh-wrapped-cli.git
cd gh-wrapped-cli

# Install dependencies
bun install  # or npm install

# Build the project
bun run build  # or npm run build

# Run the built version (use Node, not Bun - see note below)
npm start
# or
node dist/index.js
```

**⚠️ Important:** Always use **Node** to run the built version (`npm start` or `node dist/index.js`), not `bun start`. The image export feature uses Playwright which has known compatibility issues with Bun's runtime, especially on Windows. Bun is great for development and building, but Node is required for running the final output.

## How It Works

1. Fetches your public GitHub data via GitHub API
2. Analyzes commits, repositories, languages, and contribution patterns
3. Calculates streaks, peak hours, and determines your developer archetype
4. Displays results in a beautiful terminal interface
5. Optionally exports to a shareable image

## Tech Stack

| Package | Purpose |
|---------|---------|
| TypeScript | Type-safe development |
| React + Ink | Terminal UI framework |
| Octokit GraphQL | GitHub API client |
| Playwright | Headless browser for image generation |
| Bun/Node.js | Runtime environments |

## Development

### Prerequisites
- [Bun](https://bun.sh) >= 1.0.0 (recommended) OR Node.js >= 18
- For Bun installation: `curl -fsSL https://bun.sh/install | bash` (macOS/Linux) or `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows)

### Setup
```bash
# With Bun (recommended)
bun install

# Or with npm
npm install
```

### Development mode
```bash
# With Bun (recommended - hot reload)
bun run dev

# Or with npm
npm run dev
```

### Build
```bash
# With Bun (recommended - faster)
bun run build

# Or with npm
npm run build
```

### Run built version
```bash
# IMPORTANT: Use Node, not Bun (Playwright compatibility)
npm start
# or
node dist/index.js
```

### Project Structure
```
src/
├── index.tsx              # Main CLI entry point
├── github-graphql.ts      # GitHub GraphQL API client
├── analytics.ts           # Stats calculation & insights
├── ui.tsx                 # Terminal UI components
├── export-playwright.ts   # PNG export with Playwright
├── tier-calculator.ts     # Scoring and tier system
├── types.ts               # TypeScript type definitions
└── utils/
    ├── avatar-fetcher.ts      # Avatar download utility
    ├── browser-installer.ts   # Background Chromium setup
    └── html-injector.ts       # Template data injection
```

## API Usage

You can also use this as a library:

```typescript
import { GitHubGraphQLClient } from 'gh-wrapped-2025';

const client = new GitHubGraphQLClient('username', 'optional_token');
const user = await client.getUser();
const repos = await client.getRepositories();
const commits = await client.getCommitsForYear(2025);
const languages = await client.getLanguages();
```

## Rate Limits & Authentication

GitHub API has rate limits:
- **Without token**: 60 requests/hour (you'll likely hit this)
- **With token**: 5,000 requests/hour

### How Token Authentication Works

**The app handles this for you!** When you hit the rate limit:

```
⚠  GitHub API Rate Limit Exceeded

Get a token at: https://github.com/settings/tokens

Paste your GitHub token (or press Ctrl+C to exit): _
```

**That's it!** Just paste your token and the app continues.

- ✓ **Valid token?** → App continues with your data
- ✗ **Invalid token?** → Shows error, lets you try again
- **Ctrl+C** → Exit anytime

### Getting a GitHub Token (30 seconds)

1. Visit: **https://github.com/settings/tokens**
2. Click **"Generate new token (classic)"**
3. Give it a name (e.g., "GitHub Wrapped")
4. **Leave all scopes unchecked** - No permissions needed for public data
5. Click "Generate token" at the bottom
6. Copy the token
7. Paste it when the app asks

**Security Note:** A token with no scopes can only read public data - it's completely safe and cannot modify anything.

### Advanced: Skip the Prompt (Optional)

If you're developing or running this locally, you can set a token beforehand:

```bash
# Environment variable (one-time)
GITHUB_TOKEN=your_token npx gh-wrapped-2025

# Or create .env file in project directory
echo "GITHUB_TOKEN=your_token" > .env
```

**For most users: just let the app prompt you!**

## Performance & Optimizations

This project is optimized for performance:

- **Efficient API Usage**: Single GraphQL query with caching (vs multiple REST calls)
- **Smart Rate Limiting**: Fetches only top 10 repositories (adjustable)
- **Background Processing**: Chromium installs silently while you browse stats
- **Async I/O**: Non-blocking file operations
- **Type Safety**: 100% TypeScript with strict type checking
- **Small Bundle**: ~800KB minified (externalized dependencies)

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and build (`bun run build && bun run build:types`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

Please ensure:
- Code follows existing style and conventions
- TypeScript compiles without errors
- No breaking changes without discussion

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

**d3varaja**
- GitHub: [@d3varaja](https://github.com/d3varaja)
