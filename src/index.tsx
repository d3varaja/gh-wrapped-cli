#!/usr/bin/env node

import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { GitHubClient } from './github.js';
import { StatsAnalyzer } from './analytics.js';
import { StatsDisplay } from './ui.js';

// Helper: Auto-detect GitHub username from git config
function detectGitHubUsername(): string | null {
  try {
    const githubUser = execSync('git config --global github.user', { encoding: 'utf-8' }).trim();
    if (githubUser) return githubUser;
  } catch {}

  try {
    const email = execSync('git config --global user.email', { encoding: 'utf-8' }).trim();
    if (email.includes('@users.noreply.github.com')) {
      const match = email.match(/^(\d+\+)?([^@]+)@/);
      if (match) return match[2];
    }
  } catch {}

  return null;
}

// Helper: Ask for username with readline
async function promptUsername(): Promise<string> {
  const detected = detectGitHubUsername();

  console.clear();
  console.log(chalk.green.bold('\n  ██████  ██ ████████ ██   ██ ██    ██ ██████  '));
  console.log(chalk.green.bold(' ██       ██    ██    ██   ██ ██    ██ ██   ██ '));
  console.log(chalk.green.bold(' ██   ███ ██    ██    ███████ ██    ██ ██████  '));
  console.log(chalk.green.bold(' ██    ██ ██    ██    ██   ██ ██    ██ ██   ██ '));
  console.log(chalk.green.bold('  ██████  ██    ██    ██   ██  ██████  ██████  '));
  console.log('');
  console.log(chalk.green.bold(' ██     ██ ██████   █████  ██████  ██████  ███████ ██████  '));
  console.log(chalk.green.bold(' ██     ██ ██   ██ ██   ██ ██   ██ ██   ██ ██      ██   ██ '));
  console.log(chalk.green.bold(' ██  █  ██ ██████  ███████ ██████  ██████  █████   ██   ██ '));
  console.log(chalk.green.bold(' ██ ███ ██ ██   ██ ██   ██ ██      ██      ██      ██   ██ '));
  console.log(chalk.green.bold('  ███ ███  ██   ██ ██   ██ ██      ██      ███████ ██████  '));
  console.log('');
  console.log(chalk.green('                    ━━━ YOUR 2025 CODE JOURNEY ━━━'));
  console.log('');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const question = detected
      ? `Enter GitHub username (detected: ${chalk.cyan(detected)}, press Enter to use): `
      : 'Enter GitHub username: ';

    rl.question(question, (answer) => {
      rl.close();
      const username = answer.trim() || detected || '';
      resolve(username);
    });
  });
}

// Helper: Ask for token with retry loop
async function promptTokenWithRetry(
  username: string,
  fetchData: (token: string) => Promise<any>
): Promise<any> {
  console.log('');
  console.log(chalk.red.bold('⚠  GitHub API Rate Limit Exceeded'));
  console.log('');
  console.log(chalk.yellow('Without token: 60 requests/hour'));
  console.log(chalk.yellow('With token: 5,000 requests/hour'));
  console.log('');
  console.log(chalk.cyan('Get a token at: https://github.com/settings/tokens'));
  console.log(chalk.gray('(No scopes needed - just generate a basic token)'));
  console.log('');
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  while (true) {
    const token = await new Promise<string>((resolve) => {
      rl.question(chalk.cyan('Paste your GitHub token (or Ctrl+C to exit): '), (answer) => {
        resolve(answer.trim());
      });
    });

    if (!token) {
      console.log(chalk.yellow('\nNo token provided. Exiting...\n'));
      rl.close();
      process.exit(0);
    }

    console.log('');
    const spinner = ora(chalk.blue('Validating token and fetching data...')).start();

    try {
      const result = await fetchData(token);
      spinner.succeed(chalk.green('Data fetched successfully!'));
      rl.close();
      return result;
    } catch (err: any) {
      spinner.fail(chalk.red('Error: ' + err.message));
      console.log('');

      if (err.message.includes('Bad credentials')) {
        console.log(chalk.yellow('Invalid token. Please try again.\n'));
      } else if (err.message.includes('rate limit')) {
        console.log(chalk.yellow('Still rate limited. Try a different token.\n'));
      } else {
        console.log(chalk.yellow('Something went wrong. Please try again.\n'));
      }
    }
  }
}

// Main function
async function main() {
  try {
    // Step 1: Get username (plain console, no Ink!)
    const username = await promptUsername();

    if (!username) {
      console.log(chalk.red('\nUsername is required!\n'));
      process.exit(1);
    }

    console.log(chalk.green(`\n✓ Using username: ${username}\n`));

    // Step 2: Ask about comparison
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const wantComparison = await new Promise<boolean>((resolve) => {
      rl.question(chalk.cyan('Compare with 2024 data? (y/N): '), (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });

    console.log('');

    // Step 3: Fetch data function
    const fetchAllData = async (token?: string) => {
      const client = new GitHubClient(username, token);
      const analyzer = new StatsAnalyzer();

      const spinner = ora(chalk.blue('Fetching your GitHub data...')).start();

      try {
        spinner.text = chalk.blue('Loading user profile...');
        const user = await client.getUser();

        spinner.text = chalk.blue('Loading repositories...');
        const repos = await client.getRepositories();

        spinner.text = chalk.blue('Analyzing languages...');
        const languageStats = await client.getLanguages();

        spinner.text = chalk.blue('Fetching commits for 2025...');
        const commits = await client.getCommitsForYear(2025);

        spinner.text = chalk.blue('Counting pull requests...');
        const totalPRs = await client.getPullRequests(2025);

        spinner.text = chalk.blue('Counting issues...');
        const totalIssues = await client.getIssues(2025);

        spinner.text = chalk.blue('Building contribution calendar...');
        const contributions = await client.getContributionCalendar(2025);

        spinner.text = chalk.blue('Generating your wrapped...');
        const stats = await analyzer.generateWrappedStats(
          user,
          commits,
          repos,
          languageStats,
          contributions,
          totalPRs,
          totalIssues
        );

        let comparisonStats = null;
        if (wantComparison) {
          spinner.text = chalk.blue('Fetching 2024 data for comparison...');

          const commits2024 = await client.getCommitsForYear(2024);
          const prs2024 = await client.getPullRequests(2024);
          const issues2024 = await client.getIssues(2024);
          const contributions2024 = await client.getContributionCalendar(2024);

          const commits2025 = await client.getCommitsForYear(2025);
          const prs2025 = await client.getPullRequests(2025);
          const issues2025 = await client.getIssues(2025);
          const contributions2025 = await client.getContributionCalendar(2025);

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

          comparisonStats = analyzer.generateComparisonStats(year2024Data, year2025Data);
        }

        spinner.succeed(chalk.green('All data fetched!'));
        return { stats, comparisonStats };

      } catch (err: any) {
        spinner.fail(chalk.red('Failed to fetch data'));
        throw err;
      }
    };

    // Step 4: Try fetching (with or without token)
    let result;
    try {
      result = await fetchAllData(process.env.GITHUB_TOKEN);
    } catch (err: any) {
      // Rate limited - ask for token
      if (err.message.includes('rate limit') || err.message.includes('403')) {
        result = await promptTokenWithRetry(username, fetchAllData);
      } else {
        throw err;
      }
    }

    // Step 5: NOW start Ink with the results!
    console.log('');
    console.log(chalk.green('🎉 Loading your GitHub Wrapped 2025...\n'));

    // Small delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 500));

    // Import Exporter dynamically
    const { Exporter } = await import('./export.js');
    const exporter = new Exporter(result.stats);

    let inkInstance: any;

    // Render Ink UI with results
    inkInstance = render(
      <StatsDisplay
        stats={result.stats}
        onExport={async (format?: 'png' | 'svg' | 'gif') => {
          try {
            inkInstance.unmount();
            console.clear();

            if (format === 'png') {
              console.log(chalk.yellow('\n⏳ First-time PNG export will download Chrome (~120MB)'));
              console.log(chalk.yellow('This may take 1-2 minutes...\n'));
            }

            const spinner = ora(chalk.blue(`Exporting as ${format?.toUpperCase() || 'PNG'}...`)).start();

            try {
              const outputPath = await exporter.exportImage(format || 'png');
              spinner.succeed(chalk.green(`✓ Exported successfully!`));
              console.log('');
              console.log(chalk.green.bold(`📁 File saved to:`));
              console.log(chalk.cyan(`   ${outputPath}`));
              console.log('');
              console.log(chalk.gray(`Open this file to see your GitHub Wrapped card!`));
              console.log('');
            } catch (err: any) {
              spinner.fail(chalk.red(`✗ Export failed: ${err.message}`));
              console.error(chalk.red('\nFull error:'), err);
              console.log(chalk.yellow('\nTip: Try SVG export instead (press S) - works instantly!\n'));
            }
          } catch (err: any) {
            console.error(chalk.red('Error during export:'), err);
          }

          process.exit(0);
        }}
        onExit={() => process.exit(0)}
        onShare={async (platform: 'twitter' | 'linkedin') => {
          inkInstance.unmount();
          console.clear();

          if (platform === 'twitter') {
            const url = exporter.getTwitterShareURL();
            console.log(chalk.green('\n🐦 Twitter Share Link:\n'));
            console.log(chalk.cyan(url));
            console.log(chalk.gray('\nOpen this URL in your browser to share!\n'));
          } else if (platform === 'linkedin') {
            const linksPath = exporter.saveShareLinks();
            console.log(chalk.green('\n💼 LinkedIn Share Instructions:\n'));
            console.log(chalk.cyan(`Share links and text saved to: ${linksPath}`));
            console.log(chalk.gray('\nOpen the file to copy the text and LinkedIn URL!\n'));
          }

          process.exit(0);
        }}
        comparisonStats={result.comparisonStats}
      />
    );

    await inkInstance.waitUntilExit();
    process.exit(0);

  } catch (error: any) {
    console.error(chalk.red('\n\n✗ Error:'), error.message);
    process.exit(1);
  }
}

main();
