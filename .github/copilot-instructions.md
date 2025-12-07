<!-- GitHub Copilot / AI agent instructions for `gh-wrapped-cli` -->

# Brief

This file gives targeted, actionable guidance for an AI coding agent working on the `gh-wrapped-cli` repository (GitHub Wrapped CLI). Focus on the files and patterns listed below — they capture the app's architecture, developer flows, and important platform/OS quirks.

**Why this matters:** the app is a CLI + image-exporter that fetches GitHub data, analyzes it, renders a terminal UI (Ink) and optionally exports images (Satori → Sharp/Resvg). Many behaviors are implemented by coordinating multiple files (data fetch → analysis → UI → export worker).

**Quick facts**
- **Runtime:** ESM + TypeScript (built with Bun; Node required for running due to Playwright)
- **Preferred workflow:** `bun` for dev/build, `node` for running — use `bun install`, `bun run build`, `bun run dev`, then `npm start` or `node dist/index.js`
- **Key dirs/files:** `src/index.tsx`, `src/ui.tsx`, `src/github.ts`, `src/github-graphql*.ts`, `src/analytics.ts`, `src/export.ts`, `src/export-worker.mjs`, `src/types.ts`, `src/fonts/`

**Commands**
- Install deps: `bun install` (or `npm install`)
- Dev (hot reload with Bun): `bun run dev`
- Build: `bun run build` (use Bun - faster)
- Run built version: `npm start` or `node dist/index.js` (IMPORTANT: use Node, not Bun - Playwright compatibility)
- Run without installing: `bunx gh-wrapped-2025` or `npx gh-wrapped-2025`

**Important runtime notes**
- Exports use a Node worker (`src/export-worker.mjs`) invoked via file-based IPC (temp JSON files). This is intentional to avoid Bun + WASM and Windows pipe issues — do not replace this with a naive child pipe without handling the Windows case.
- Fonts used for exports live in `src/fonts/PressStart2P-Regular.ttf` and are loaded as ArrayBuffer for Satori.
- The app supports `GITHUB_TOKEN` env var and an interactive token prompt (see `src/ui.tsx` and `README.md`).

**Architecture & data flow (high level)**
- Entry: `src/index.tsx` — detects username from git config and calls `GitHubWrappedApp` (Ink render). The Ink render is a long-lived single render (never unmounts).
- Data layer: `src/github.ts` (Octokit REST client) and `src/github-graphql*.ts` (GraphQL client). Use REST for repository & commit listings; GraphQL holds richer queries (e.g., lines changed).
- Analysis: `src/analytics.ts` (streaks, top languages, archetype, achievements). When adding metrics, update types in `src/types.ts` and keep analyzer pure.
- UI: `src/ui.tsx` — multiple “slides” and input flows. Prefer adding isolated components (e.g., new slide components) and keep animation hooks stable (note: the repo currently returns immediate values to avoid re-render loops).
- Export: `src/export.ts` orchestrates Satori rendering and uses `src/export-worker.mjs` to produce PNG/SVG via Sharp/Resvg in Node. The export writes temp input/output files and reads results — respect that IPC contract when changing worker arguments.

**Project-specific patterns & gotchas**
- Pagination & scope: `GitHubClient.getCommitsForYear` only requests commits from the 10 most recently-updated repos (`repos.slice(0, 10)`). If you need more comprehensive coverage, update this logic and be mindful of rate limits.
- Error handling: `src/github.ts` maps Octokit errors to user-friendly messages (404, 403 rate limit). Preserve these mappings when refactoring.
- Terminal sizing: `src/ui.tsx` contains custom terminal-sizing math to approximate a visual square using terminal character aspect ratio (~2:1). UI adjustments should respect that logic to avoid layout regressions.
- Animation hooks are intentionally simplified (no incremental animation) for stability. Re-introduce animations only after verifying no re-render loops in Ink.
- Export worker: always run the worker under Node (`node export-worker.mjs <input> <output>`). On Windows and in Git Bash, Bun pipes are flaky — the file-based IPC and Node worker are deliberate.

**Where to make changes for common tasks**
- Add a new UI slide: update `src/ui.tsx`, export the component, and wire it into the slide list. Keep each slide a pure component consuming `WrappedStats`.
- Add new analysis metric: add types in `src/types.ts`, compute in `src/analytics.ts`, and surface the value via the stats object passed to UI and export.
- Modify export layout/appearance: edit `src/export-worker.mjs` (JSX used by Satori) or `src/export.ts` (font loading, exporter orchestration). Remember worker uses Node and Sharp/Satori; test on Windows.
- Increase commit coverage: update `src/github.ts` `getCommitsForYear` (adjust repo selection and pagination). Update rate-limit handling and consider requiring `GITHUB_TOKEN` in tests.

**Examples & snippets (copyable)**
- Run app locally (recommended):
  - `bun install`
  - `bun run build`
  - `npm start` (or `node dist/index.js` - use Node, NOT Bun)

- Run export worker directly for debugging:
  - `node src/export-worker.mjs /path/to/input.json /path/to/output.json`
  - Input JSON shape: `{ "stats": <WrappedStats>, "filename": "./out.png", "format": "png" }`

**Files to read first (quick orientation)**
- `src/index.tsx` — CLI entry, Ink render lifecycle
- `src/ui.tsx` — main terminal UI and input flows
- `src/github.ts` — REST-based GitHub client (Octokit) and pagination decisions
- `src/github-graphql*.ts` — GraphQL queries for richer data (lines changed, etc.)
- `src/analytics.ts` — calculations and achievement rules (deterministic)
- `src/export.ts` + `src/export-worker.mjs` — the export orchestration and worker contract

**Testing & verification guidance**
- Use `bun run dev` for iterating UI changes (fast). Use `bun run build` then `npm start` (or `node dist/index.js`) to replicate production behavior.
- For export changes, run the worker directly with `node` and a synthetic `input.json` containing a minimal `WrappedStats` object to validate Satori → Sharp rendering.
- **IMPORTANT:** Never test with `bun start` - Playwright has compatibility issues with Bun runtime. Always use Node for running the built version.

If anything in this guidance is unclear or you want more detail for a specific area (e.g., GraphQL queries, export fonts, or how achievements are calculated), tell me which part and I will expand or update this file.
