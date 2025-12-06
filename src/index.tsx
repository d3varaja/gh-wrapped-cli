#!/usr/bin/env node

import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { GitHubGraphQLClient } from './github-graphql-fixed.js';
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

    // Default to current year (2025)
    const selectedYear = new Date().getFullYear();
    const wantComparison = false;

    // Step 4: Fetch data function (using GraphQL for REAL data!)
    const fetchAllData = async (token?: string, year: number = selectedYear) => {
      const client = new GitHubGraphQLClient(username, token);
      const analyzer = new StatsAnalyzer();

      const startDate = new Date(`${year}-01-01`);
      const endDate = year === new Date().getFullYear() ? new Date() : new Date(`${year}-12-31`);
      const dateRangeStr = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      const spinner = ora(chalk.blue(`Fetching GitHub data for ${year} (${dateRangeStr})...`)).start();

      try {
        spinner.text = chalk.blue(`Fetching ${year} data via GraphQL...`);

        const [user, repos, languageStats, commits, totalPRs, totalIssues, contributions, realLinesChanged, accurateCommitCount] = await Promise.all([
          client.getUser(),
          client.getRepositories(),
          client.getLanguages(),
          client.getCommitsForYear(year),
          client.getPullRequests(year),
          client.getIssues(year),
          client.getContributionCalendar(year),
          client.getTotalLinesChanged(year),
          client.getTotalCommitCount(year)
        ]);

        spinner.text = chalk.blue('Generating your wrapped with REAL data...');
        const stats = await analyzer.generateWrappedStats(
          user,
          commits,
          repos,
          languageStats,
          contributions,
          totalPRs,
          totalIssues,
          realLinesChanged,
          year,
          dateRangeStr,
          accurateCommitCount
        );

        let comparisonStats = null;
        if (wantComparison) {
          const previousYear = year - 1;
          spinner.text = chalk.blue(`Fetching ${previousYear} & ${year} data in parallel for comparison...`);

          const [
            commitsPrev,
            prsPrev,
            issuesPrev,
            contributionsPrev,
            accurateCommitsPrev,
            commitsCurr,
            prsCurr,
            issuesCurr,
            contributionsCurr,
            accurateCommitsCurr
          ] = await Promise.all([
            client.getCommitsForYear(previousYear),
            client.getPullRequests(previousYear),
            client.getIssues(previousYear),
            client.getContributionCalendar(previousYear),
            client.getTotalCommitCount(previousYear),
            client.getCommitsForYear(year),
            client.getPullRequests(year),
            client.getIssues(year),
            client.getContributionCalendar(year),
            client.getTotalCommitCount(year)
          ]);

          const yearPrevData = analyzer.generateYearComparison(
            previousYear,
            commitsPrev,
            languageStats,
            contributionsPrev,
            prsPrev,
            issuesPrev,
            accurateCommitsPrev
          );

          const yearCurrData = analyzer.generateYearComparison(
            year,
            commitsCurr,
            languageStats,
            contributionsCurr,
            prsCurr,
            issuesCurr,
            accurateCommitsCurr
          );

          comparisonStats = analyzer.generateComparisonStats(yearPrevData, yearCurrData);
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

    // Import SimpleExporter - SVG only, no crashes
    const { SimpleExporter } = await import('./export-simple.js');
    const exporter = new SimpleExporter(result.stats);

    let inkInstance: any;

    // Render Ink UI with results
    inkInstance = render(
      <StatsDisplay
        stats={result.stats}
        onExport={async (format?: 'png' | 'svg' | 'gif') => {
          try {
            await exporter.exportSVG();
            // Don't unmount or exit - let the farewell slide show
          } catch (err: any) {
            console.error(chalk.red('Export error:'), err);
          }
        }}
        onExit={() => process.exit(0)}
        onShare={async (platform: 'twitter' | 'linkedin') => {
          try {
            if (platform === 'twitter') {
              exporter.getTwitterShareURL();
            } else if (platform === 'linkedin') {
              exporter.saveShareLinks();
            }
            // Don't unmount or exit - let the farewell slide show
          } catch (err: any) {
            console.error(chalk.red('Share error:'), err);
          }
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
