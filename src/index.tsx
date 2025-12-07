#!/usr/bin/env node

import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { execSync } from 'child_process';
import { GitHubWrappedApp } from './ui.js';

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

// Main function
async function main() {
  const detected = detectGitHubUsername();

  // Clear terminal and reset cursor
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H');

  // Hide cursor during render
  process.stdout.write('\x1B[?25l');

  // Single render with proper cleanup
  const { waitUntilExit } = render(
    <GitHubWrappedApp detectedUsername={detected} />
  );

  await waitUntilExit();

  // Show cursor again
  process.stdout.write('\x1B[?25h');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n\n✗ Error:', error.message);
  process.exit(1);
});
