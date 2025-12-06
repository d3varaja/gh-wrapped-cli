#!/usr/bin/env node

import 'dotenv/config';
import React, { useState, useEffect } from 'react';
import { render, useApp } from 'ink';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { GitHubClient } from './github.js';
import { StatsAnalyzer } from './analytics.js';
import { Exporter } from './export.js';
import { UsernameInput, LoadingScreen, StatsDisplay, ComparisonPrompt } from './ui.js';
import type { WrappedStats, ComparisonStats } from './types.js';

type AppState = 'input' | 'loading' | 'display' | 'exporting' | 'done' | 'token-prompt' | 'comparison-prompt';

// Helper: Prompt for token using raw stdin (works on Windows!)
async function promptForTokenWithRetry(
  username: string,
  enableComparison: boolean,
  fetchGitHubData: (username: string, token: string) => Promise<any>,
  fetchComparisonData: (username: string, token: string) => Promise<any>
): Promise<{ stats: any; comparisonStats: any | null } | null> {

  console.clear();
  console.log('\n' + chalk.red.bold('⚠  GitHub API Rate Limit Exceeded') + '\n');
  console.log(chalk.yellow('Without authentication: 60 requests/hour'));
  console.log(chalk.yellow('With a token: 5,000 requests/hour') + '\n');
  console.log(chalk.cyan('Get a token at: https://github.com/settings/tokens'));
  console.log(chalk.gray('(No scopes needed - just generate a basic token)') + '\n');
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') + '\n');

  while (true) {
    // Use raw stdin without any library
    const token = await new Promise<string | null>((resolve) => {
      process.stdout.write(chalk.cyan('Paste your GitHub token (or press Ctrl+C to exit): '));

      let input = '';
      let resolved = false;

      const onData = (chunk: Buffer) => {
        if (resolved) return;

        const str = chunk.toString();

        // Handle Ctrl+C
        if (str === '\u0003') {
          resolved = true;
          cleanup();
          console.log('\n\n' + chalk.yellow('Exiting...') + '\n');
          resolve(null);
          return;
        }

        // Handle Enter
        if (str === '\n' || str === '\r' || str === '\r\n') {
          resolved = true;
          cleanup();
          console.log(''); // New line
          resolve(input.trim() || null);
          return;
        }

        // Accumulate input (filter out control characters)
        input += str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
      };

      const cleanup = () => {
        process.stdin.removeAllListeners('data');
        process.stdin.pause();
        process.stdin.setRawMode && process.stdin.setRawMode(false);
      };

      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', onData);
    });

    if (!token) {
      return null;
    }

    console.log('\n' + chalk.blue('⏳ Validating token and fetching data...') + '\n');

    try {
      // Try to fetch data with the token
      const stats = await fetchGitHubData(username, token);

      let comparisonStats = null;
      if (enableComparison) {
        console.log(chalk.blue('⏳ Fetching 2024 comparison data...') + '\n');
        comparisonStats = await fetchComparisonData(username, token);
      }

      console.log(chalk.green('✓ Success! Loading your GitHub Wrapped...') + '\n');
      return { stats, comparisonStats };

    } catch (err: any) {
      console.log(chalk.red('\n✗ Error: ' + err.message) + '\n');

      if (err.message.includes('Bad credentials')) {
        console.log(chalk.yellow('Your token is invalid. Please check and try again.') + '\n');
      } else if (err.message.includes('rate limit')) {
        console.log(chalk.yellow('Still rate limited. The token might be incorrect or already exhausted.') + '\n');
      } else {
        console.log(chalk.yellow('Something went wrong. Please try again.') + '\n');
      }

      // Loop continues - ask for token again
    }
  }
}

// Helper: Auto-detect GitHub username from git config
function detectGitHubUsername(): string | null {
  try {
    // Try git config github.user
    const githubUser = execSync('git config --global github.user', { encoding: 'utf-8' }).trim();
    if (githubUser) return githubUser;
  } catch {}

  try {
    // Try extracting from git config user.email (username@users.noreply.github.com)
    const email = execSync('git config --global user.email', { encoding: 'utf-8' }).trim();
    if (email.includes('@users.noreply.github.com')) {
      const match = email.match(/^(\d+\+)?([^@]+)@/);
      if (match) return match[2];
    }
  } catch {}

  return null;
}

function App() {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>('input');
  const [username, setUsername] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | undefined>(process.env.GITHUB_TOKEN);
  const [detectedUsername, setDetectedUsername] = useState<string | null>(null);
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats | null>(null);
  const [enableComparison, setEnableComparison] = useState<boolean>(false);

  // Auto-detect username on mount
  useEffect(() => {
    const detected = detectGitHubUsername();
    setDetectedUsername(detected);
  }, []);

  // Handle token prompt when state changes to token-prompt
  useEffect(() => {
    if (state === 'token-prompt') {
      // Exit Ink to free up stdin for readline
      exit();

      // Give Ink time to exit
      setTimeout(async () => {
        try {
          const result = await promptForTokenWithRetry(
            username,
            enableComparison,
            fetchGitHubData,
            fetchComparisonData
          );

          if (!result) {
            // User pressed Ctrl+C
            process.exit(0);
            return;
          }

          console.log(chalk.green('\n✓ Data fetched! Starting display...\n'));

          // Success! We have the data
          // Wait a bit for stdin to settle
          await new Promise(resolve => setTimeout(resolve, 300));

          // Re-render Ink app with results
          const { waitUntilExit } = render(
            <StatsDisplay
              stats={result.stats}
              onExport={async () => {}}
              onExit={() => process.exit(0)}
              comparisonStats={result.comparisonStats}
            />,
            {
              stdin: process.stdin,
              stdout: process.stdout,
              stderr: process.stderr,
              patchConsole: false,
            }
          );

          await waitUntilExit();
          process.exit(0);
        } catch (error: any) {
          console.error(chalk.red('\n\nFatal error:'), error.message);
          console.error(error.stack);
          process.exit(1);
        }
      }, 200);
    }
  }, [state, exit]);

  const fetchGitHubData = async (username: string, token?: string) => {
    const client = new GitHubClient(username, token);
    const analyzer = new StatsAnalyzer();

    const totalSteps = 8;
    let currentStep = 0;

    // Fetch data with progress
    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Loading user profile...`);
    const user = await client.getUser();

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Loading repositories...`);
    const repos = await client.getRepositories();

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Analyzing languages...`);
    const languageStats = await client.getLanguages();

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Fetching commits for 2025...`);
    const commits = await client.getCommitsForYear(2025);

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Counting pull requests...`);
    const totalPRs = await client.getPullRequests(2025);

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Counting issues...`);
    const totalIssues = await client.getIssues(2025);

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Building contribution calendar...`);
    const contributions = await client.getContributionCalendar(2025);

    currentStep++;
    setLoadingMessage(`[${Math.floor((currentStep / totalSteps) * 100)}%] Generating your wrapped...`);
    const wrappedStats = await analyzer.generateWrappedStats(
      user,
      commits,
      repos,
      languageStats,
      contributions,
      totalPRs,
      totalIssues
    );

    return wrappedStats;
  };

  const fetchComparisonData = async (username: string, token?: string): Promise<ComparisonStats> => {
    const client = new GitHubClient(username, token);
    const analyzer = new StatsAnalyzer();

    // Fetch 2024 data
    setLoadingMessage('[50%] Fetching 2024 commits...');
    const commits2024 = await client.getCommitsForYear(2024);

    setLoadingMessage('[60%] Fetching 2024 PRs and issues...');
    const prs2024 = await client.getPullRequests(2024);
    const issues2024 = await client.getIssues(2024);

    setLoadingMessage('[70%] Analyzing 2024 languages...');
    const languageStats = await client.getLanguages();

    setLoadingMessage('[80%] Building 2024 contribution calendar...');
    const contributions2024 = await client.getContributionCalendar(2024);

    // Fetch 2025 data
    setLoadingMessage('[85%] Fetching 2025 commits...');
    const commits2025 = await client.getCommitsForYear(2025);

    setLoadingMessage('[90%] Fetching 2025 PRs and issues...');
    const prs2025 = await client.getPullRequests(2025);
    const issues2025 = await client.getIssues(2025);

    setLoadingMessage('[95%] Building 2025 contribution calendar...');
    const contributions2025 = await client.getContributionCalendar(2025);

    setLoadingMessage('[100%] Comparing your years...');

    const year2024Data = analyzer.generateYearComparison(
      2024,
      commits2024,
      languageStats,
      contributions2024,
      prs2024,
      issues2024
    );

    const year2025Data = analyzer.generateYearComparison(
      2025,
      commits2025,
      languageStats,
      contributions2025,
      prs2025,
      issues2025
    );

    return analyzer.generateComparisonStats(year2024Data, year2025Data);
  };

  const handleUsernameSubmit = async (inputUsername: string) => {
    const trimmedUsername = inputUsername.trim();

    // Validate username
    if (!trimmedUsername) {
      setError('Username cannot be empty');
      setState('input');
      return;
    }

    // Validate GitHub username format (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(trimmedUsername)) {
      setError('Invalid username format. GitHub usernames can only contain letters, numbers, and hyphens.');
      setState('input');
      return;
    }

    setUsername(trimmedUsername);
    setError(null);

    // Ask about comparison mode
    setState('comparison-prompt');
  };

  const handleComparisonChoice = async (wantComparison: boolean) => {
    setEnableComparison(wantComparison);
    setState('loading');
    setLoadingMessage('Fetching your GitHub data...');

    try {
      const wrappedStats = await fetchGitHubData(username, githubToken);
      setStats(wrappedStats);

      // Fetch 2024 data if comparison enabled
      if (wantComparison) {
        setLoadingMessage('Fetching 2024 data for comparison...');
        const comparison = await fetchComparisonData(username, githubToken);
        setComparisonStats(comparison);
      }

      setState('display');
    } catch (err: any) {
      // Handle different error types
      let errorMessage = err.message || 'An unexpected error occurred';

      // Rate limit errors - show token prompt
      if (err.message.includes('rate limit') || err.message.includes('403')) {
        setState('token-prompt');
        return;
      }

      // Network errors
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      }

      // Timeout errors
      if (err.code === 'ETIMEDOUT') {
        errorMessage = 'Request timed out. Please try again.';
      }

      setError(errorMessage);
      setState('input');
    }
  };


  const handleExport = async (format: 'png' | 'svg' | 'gif' = 'png') => {
    if (!stats) return;

    setState('exporting');
    const formatLabel = format.toUpperCase();
    setLoadingMessage(`Generating ${formatLabel} export...`);

    try {
      const exporter = new Exporter(stats);
      const imagePath = await exporter.exportImage(format);

      setLoadingMessage(`${formatLabel} saved to: ${imagePath}`);

      // Wait a bit to show success message
      await new Promise(resolve => setTimeout(resolve, 3000));

      setState('done');
      process.exit(0);
    } catch (err: any) {
      let errorMessage = 'Failed to export image';

      if (err.message.includes('puppeteer')) {
        errorMessage = 'Puppeteer error. Make sure Chromium is installed: npm install puppeteer';
      } else if (err.code === 'EACCES') {
        errorMessage = 'Permission denied. Check if you have write access to the current directory.';
      } else if (err.code === 'ENOSPC') {
        errorMessage = 'No space left on device. Free up some disk space and try again.';
      } else {
        errorMessage = `Export failed: ${err.message}`;
      }

      setError(errorMessage);
      setState('display');
      setTimeout(() => setError(null), 100);
    }
  };

  const handleExit = () => {
    process.exit(0);
  };

  const handleShare = async (platform: 'twitter' | 'linkedin') => {
    if (!stats) return;

    setState('exporting');
    setLoadingMessage(`Generating ${platform} share links...`);

    try {
      const exporter = new Exporter(stats);
      const sharePath = exporter.saveShareLinks();

      setLoadingMessage(`Share links saved to: ${sharePath}`);

      // Wait a bit to show success message
      await new Promise(resolve => setTimeout(resolve, 3000));

      setState('done');
      process.exit(0);
    } catch (err: any) {
      const errorMessage = `Failed to generate share links: ${err.message}`;
      setError(errorMessage);
      setState('display');
      setTimeout(() => setError(null), 100);
    }
  };

  switch (state) {
    case 'input':
      return <UsernameInput onSubmit={handleUsernameSubmit} error={error} detectedUsername={detectedUsername} />;

    case 'comparison-prompt':
      return <ComparisonPrompt username={username} onChoice={handleComparisonChoice} />;

    case 'token-prompt':
      // Don't show anything - readline prompt handles it
      return null;

    case 'loading':
    case 'exporting':
      return <LoadingScreen message={loadingMessage} />;

    case 'display':
      return stats ? (
        <StatsDisplay
          stats={stats}
          onExport={handleExport}
          onExit={handleExit}
          onShare={handleShare}
          comparisonStats={comparisonStats}
        />
      ) : (
        <LoadingScreen message="Loading..." />
      );

    case 'done':
      return <LoadingScreen message="✨ All done! Thanks for using GitHub Wrapped 2025!" />;

    default:
      return <LoadingScreen message="Loading..." />;
  }
}

// Start the app
async function main() {
  const { waitUntilExit } = render(<App />, {
    stdin: process.stdin,
    stdout: process.stdout,
    stderr: process.stderr,
    patchConsole: false,
  });

  await waitUntilExit();
}

main().catch(() => process.exit(1));
