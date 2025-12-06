# GitHub Wrapped 2025

Your GitHub year in review, directly in your terminal.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)

A CLI tool that analyzes your GitHub activity for 2025 and generates beautiful statistics and shareable images. Like Spotify Wrapped, but for developers.

## Quick Start

### Using Bun (Recommended - 100x faster)
```bash
bunx github-wrapped-2025
```

### Using npm
```bash
npx github-wrapped-2025
```

1. Enter your GitHub username
2. If prompted, paste your GitHub token (get one at https://github.com/settings/tokens)
3. View your year in review!

**That's it!** No setup, no config files needed.

## Features

- **Comprehensive Stats**: Commits, PRs, issues, contribution streaks
- **Language Analysis**: Top programming languages with usage percentages
- **Peak Hours Detection**: Discover when you're most productive
- **Developer Archetypes**: Get classified based on your coding patterns
- **Achievement System**: Unlock achievements based on your activity
- **Image Export**: Generate high-quality 1200x675px images for social media
- **Privacy First**: All processing happens locally, no data collection

## Installation

### Run with bunx (Recommended - 100x faster!)
```bash
bunx github-wrapped-2025
```
No installation needed! Just run it once and the app handles everything.

### Run with npx (Also works)
```bash
npx github-wrapped-2025
```

### Install Globally
```bash
# With Bun
bun install -g github-wrapped-2025
github-wrapped

# With npm
npm install -g github-wrapped-2025
github-wrapped
```

### For Developers
```bash
git clone https://github.com/d3varaja/gh-wrapped-cli.git
cd gh-wrapped-cli

# Install with Bun (recommended)
bun install
bun run build
bun start

# Or with npm
npm install
npm run build
npm start
```

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
| Ink | React-based terminal UI |
| Octokit | GitHub API client |
| Puppeteer | Image generation |
| Chalk | Terminal styling |

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
# With Bun (hot reload)
bun run dev

# Or with npm
npm run dev
```

### Build
```bash
# With Bun (faster)
bun run build

# Or with npm
npm run build
```

### Project Structure
```
src/
├── index.tsx       # Main CLI entry point
├── github.ts       # GitHub API client
├── analytics.ts    # Stats calculation
├── ui.tsx          # Terminal UI components
├── export.ts       # Image export functionality
└── types.ts        # TypeScript definitions
```

## API Usage

You can also use this as a library:

```typescript
import { GitHubClient } from 'github-wrapped-2025';

const client = new GitHubClient('username');
const repos = await client.getRepositories();
const commits = await client.getCommitsForYear(2025);
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
3. **No scopes needed** - just click "Generate token" at the bottom
4. Copy the token
5. Paste it when the app asks

### Advanced: Skip the Prompt (Optional)

If you're developing or running this locally, you can set a token beforehand:

```bash
# Environment variable (one-time)
GITHUB_TOKEN=your_token npx github-wrapped-2025

# Or create .env file in project directory
echo "GITHUB_TOKEN=your_token" > .env
```

**For most users: just let the app prompt you!**

## Contributing

Contributions welcome. Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

**d3varaja**
- GitHub: [@d3varaja](https://github.com/d3varaja)

## Acknowledgments

Built for the developer community. Inspired by Spotify Wrapped.
