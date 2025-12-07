import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, Newline, useInput, useApp, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import chalk from 'chalk';
import open from 'open';
import type { WrappedStats, ComparisonStats, AppState } from './types.js';
import { GitHubGraphQLClient } from './github-graphql-fixed.js';
import { StatsAnalyzer } from './analytics.js';

// Matrix green color
const green = '#00FF41';
const darkGreen = '#008F11';

// ============================================
// ANIMATION HOOKS
// ============================================

// Hook 1: Count up animation for numbers (disabled for stability)
function useCountUp(target: number, duration: number = 1500) {
  // Return target immediately without animation to prevent re-render loop
  return target;
}

// Hook 2: Progress bar animation (Node.js compatible)
function useProgressBar(targetPercentage: number, delay: number = 0, duration: number = 800) {
  const [currentPercentage, setCurrentPercentage] = useState(0);

  useEffect(() => {
    // Wait for delay before starting animation
    const delayTimer = setTimeout(() => {
      const startTime = Date.now();
      const startValue = 0;
      const frameRate = 16; // ~60fps

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function for smooth animation (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (targetPercentage - startValue) * eased;

        setCurrentPercentage(current);

        if (progress < 1) {
          setTimeout(animate, frameRate);
        } else {
          setCurrentPercentage(targetPercentage);
        }
      };

      animate();
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [targetPercentage, delay, duration]);

  return currentPercentage;
}

// Hook 3: Staggered reveal for list items (disabled for stability)
function useStaggeredReveal(totalItems: number, delayBetween: number = 150) {
  // Return total immediately without animation to prevent re-render loop
  return totalItems;
}

// Hook 4: Pulse animation with smooth transition (cycles through brightness levels)
function usePulse(interval: number = 200) {
  const [brightness, setBrightness] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBrightness(prev => (prev + 1) % 6); // Cycle through 6 states: 0->1->2->3->4->5->0
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  // Map brightness to visual state
  // 0: full bright
  // 1: bright
  // 2: medium (dim)
  // 3: low (very dim)
  // 4: medium (dim)
  // 5: bright
  return brightness;
}

interface Props {
  onSubmit: (username: string) => void;
  error?: string | null;
  detectedUsername?: string | null;
}

export function UsernameInput({ onSubmit, error, detectedUsername }: Props) {
  const [manualEntry, setManualEntry] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Ensure stdin is in raw mode for input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
  }, []);

  // Get terminal dimensions for 4:3 ratio box
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 80;
  const termHeight = stdout?.rows || 24;

  // Calculate 1:1 visual square (accounting for terminal character aspect ratio)
  // Terminal characters are ~2:1 (height:width), so for visual square: height = width * 0.5
  // Use 98% of available space for larger display
  const usableWidth = Math.floor(termWidth * 0.98);
  const usableHeight = Math.floor(termHeight * 0.98);

  // Calculate dimensions for visually square appearance
  let boxWidth = usableWidth;
  let boxHeight = Math.floor(boxWidth * 0.5); // Account for character aspect ratio

  // Adjust if height exceeds available space
  if (boxHeight > usableHeight) {
    boxHeight = usableHeight;
    boxWidth = Math.floor(boxHeight * 2); // Maintain visual square ratio
  }

  // Ensure minimum width but allow height to shrink for centering
  boxWidth = Math.max(boxWidth, 80);

  // Don't enforce minimum height - let it shrink to fit terminal
  // This allows vertical centering to work properly

  // Calculate vertical padding for centering (leave some margin)
  const verticalPadding = Math.max(1, Math.floor((termHeight - boxHeight - 4) / 2));

  // Logo - complete ASCII art (smaller spacing)
  const logoLines = [
    '  ██████╗ ██╗████████╗██╗  ██╗██╗   ██╗██████╗ ',
    ' ██╔════╝ ██║╚══██╔══╝██║  ██║██║   ██║██╔══██╗',
    ' ██║  ███╗██║   ██║   ███████║██║   ██║██████╔╝',
    ' ██║   ██║██║   ██║   ██╔══██║██║   ██║██╔══██╗',
    ' ╚██████╔╝██║   ██║   ██║  ██║╚██████╔╝██████╔╝',
    '  ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ',
    ' ██╗    ██╗██████╗  █████╗ ██████╗ ██████╗ ███████╗██████╗ ',
    ' ██║    ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗',
    ' ██║ █╗ ██║██████╔╝███████║██████╔╝██████╔╝█████╗  ██║  ██║',
    ' ██║███╗██║██╔══██╗██╔══██║██╔═══╝ ██╔═══╝ ██╔══╝  ██║  ██║',
    ' ╚███╔███╔╝██║  ██║██║  ██║██║     ██║     ███████╗██████╔╝',
    '  ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚═════╝ '
  ];

  const menuItems = [
    { label: `✓ Use detected: ${detectedUsername}`, value: 'detected' },
    { label: '✏️  Enter manually', value: 'manual' },
  ];

  // Unified selection state for all items (menu + navigation)
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Show menu only if we have a detected username and user hasn't chosen manual entry
  const showMenu = detectedUsername && !manualEntry;

  // Combine menu and navigation into single selectable list
  const allSelectableItems = showMenu ? [
    { type: 'menu' as const, label: `✓ Use detected: ${detectedUsername}`, value: 'detected' },
    { type: 'menu' as const, label: '✏️  Enter manually', value: 'manual' },
    { type: 'nav' as const, label: 'GitHub', url: 'https://github.com/d3varaja/gh-wrapped-cli' },
    { type: 'nav' as const, label: 'See Demo', url: 'https://github.com/d3varaja/gh-wrapped-cli#demo' },
  ] : [];

  const handleMenuSelect = (item: { value: string }) => {
    if (item.value === 'detected' && detectedUsername) {
      onSubmit(detectedUsername);
    } else {
      setManualEntry(true);
    }
  };

  const handleSubmit = () => {
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  // Handle unified arrow key navigation
  useInput((input, key) => {
    // Only handle when showing menu
    if (!showMenu) return;

    if (key.upArrow) {
      setSelectedIndex((prev) =>
        prev === 0 ? allSelectableItems.length - 1 : prev - 1
      );
    }

    if (key.downArrow) {
      setSelectedIndex((prev) =>
        (prev + 1) % allSelectableItems.length
      );
    }

    if (key.return && allSelectableItems.length > 0) {
      const selected = allSelectableItems[selectedIndex];
      if (selected.type === 'menu' && 'value' in selected) {
        handleMenuSelect({ value: selected.value });
      } else if (selected.type === 'nav' && 'url' in selected) {
        open(selected.url).catch(() => {
          // Silently fail if can't open
        });
      }
    }
  });

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      width="100%"
    >
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="green"
        paddingX={4}
        paddingY={1}
        width={boxWidth}
        height={boxHeight}
        alignItems="center"
        marginTop={verticalPadding}
      >
        {/* Top spacer to prevent cut-off */}
        <Text> </Text>

        {/* Title - Compact ASCII Logo */}
        <Box marginBottom={1} flexDirection="column" alignItems="center">
          {logoLines.map((line, i) => (
            <Text key={i} bold color="green">{line}</Text>
          ))}
        </Box>

        <Box marginBottom={3} justifyContent="center">
          <Text color="green" dimColor>━━━ YOUR 2025 CODE JOURNEY ━━━</Text>
        </Box>

        {/* Menu or Input Box */}
        <Box
          borderStyle="single"
          borderColor="green"
          paddingX={2}
          paddingY={1}
          flexDirection="column"
          width={70}
        >
          {error && (
            <Box marginBottom={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}

          {showMenu ? (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text color="green">&gt; Select option</Text>
              </Box>
              <Box marginBottom={1}>
                <Text color="cyan" dimColor>Use ↑↓ arrows to select, Enter to confirm</Text>
              </Box>

              {/* Render menu items manually */}
              {allSelectableItems.slice(0, 2).map((item, i) => (
                <Box key={i}>
                  <Text color={selectedIndex === i ? "white" : "green"}>
                    {selectedIndex === i ? '❯ ' : '  '}{item.label}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : (
            <Box flexDirection="column">
              <Box marginBottom={1}>
                <Text color="green">&gt; Enter GitHub username</Text>
              </Box>
              <Box>
                <Text color="green">&gt;_ </Text>
                <TextInput
                  value={username}
                  onChange={(value) => setUsername(value)}
                  onSubmit={() => handleSubmit()}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Navigation Bar - Unified with arrow keys */}
        <Box marginTop={3} justifyContent="center" gap={2}>
          {showMenu && allSelectableItems.slice(2).map((item, i) => {
            const actualIndex = i + 2; // Offset by 2 menu items
            const isSelected = selectedIndex === actualIndex;

            return (
              <React.Fragment key={item.label}>
                <Text color={isSelected ? "white" : "green"}>[ </Text>
                <Text
                  color={isSelected ? "white" : "green"}
                  bold={isSelected}
                >
                  {item.label}
                </Text>
                <Text color={isSelected ? "white" : "green"}> ]</Text>
              </React.Fragment>
            );
          })}
        </Box>

        <Box justifyContent="center" marginTop={1}>
          <Text color="green" dimColor>
            {showMenu && selectedIndex < 2
              ? 'Use ↑↓ arrows to navigate all options • Press Enter to select'
              : showMenu && selectedIndex >= 2
              ? `Press Enter to open ${allSelectableItems[selectedIndex]?.label || ''} • github.com/d3varaja/gh-wrapped-cli`
              : 'github.com/d3varaja/gh-wrapped-cli'}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

interface LoadingProps {
  message: string;
}

export function LoadingScreen({ message }: LoadingProps) {
  // Extract progress if in message format
  const progressMatch = message.match(/(\d+)%/);
  const hasProgress = progressMatch !== null;
  const percentage = hasProgress ? parseInt(progressMatch[1]) : 0;

  // Fun facts
  const funFacts = [
    '💡 GitHub was founded in 2008',
    '🚀 Over 100M developers use GitHub',
    '⭐ The most starred repo has 400K+ stars',
    '🔥 Most commits happen on Tuesdays',
    '🌙 Peak coding time is 2-4 PM worldwide',
    '💻 JavaScript is the #1 language on GitHub',
  ];

  const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={1}>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text color="green"> {message.replace(/\d+%/, '').trim()}</Text>
      </Box>

      {hasProgress && (
        <>
          <Box marginBottom={1}>
            <Text color="green">
              [{'█'.repeat(Math.floor(percentage / 5))}{'░'.repeat(20 - Math.floor(percentage / 5))}] {percentage}%
            </Text>
          </Box>
          <Box>
            <Text color="gray" dimColor>{randomFact}</Text>
          </Box>
        </>
      )}
    </Box>
  );
}

interface TokenInputProps {
  onSubmit: (token: string) => void;
  onSkip: () => void;
  error?: string | null;
}

export function TokenInput({ onSubmit, onSkip, error }: TokenInputProps) {
  const [token, setToken] = useState('');

  const handleSubmit = () => {
    if (token.trim()) {
      onSubmit(token.trim());
    }
  };

  useInput((input, key) => {
    if (input === '\x03') {
      onSkip();
    }
  });

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={1}>
        <Text bold color="red">⚠ GitHub API Rate Limit Exceeded</Text>
      </Box>

      <Box
        borderStyle="single"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={70}
        marginBottom={2}
      >
        <Box marginBottom={1}>
          <Text color="yellow">Without authentication, GitHub limits you to 60 requests/hour.</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="yellow">With a token, you get 5,000 requests/hour.</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="green">Get a token: https://github.com/settings/tokens</Text>
        </Box>
        <Box>
          <Text color="green" dimColor>(No special permissions needed - just create with no scopes)</Text>
        </Box>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box
        borderStyle="single"
        borderColor="green"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={70}
        marginBottom={2}
      >
        <Box marginBottom={1}>
          <Text color="green">&gt; Enter GitHub Token (or press Ctrl+C to exit)</Text>
        </Box>

        <Box>
          <Text color="green">&gt;_ </Text>
          <TextInput
            value={token}
            onChange={(value) => setToken(value)}
            onSubmit={() => handleSubmit()}
            mask="*"
          />
        </Box>
      </Box>

      <Box>
        <Text color="green" dimColor>Press Enter to submit token, or Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
}

interface ComparisonPromptProps {
  username: string;
  onChoice: (wantComparison: boolean) => void;
}

export function ComparisonPrompt({ username, onChoice }: ComparisonPromptProps) {
  const menuItems = [
    { label: '📊 Yes, compare with 2024', value: 'yes' },
    { label: '➡️  No, show 2025 only', value: 'no' },
  ];

  const handleMenuSelect = (item: { value: string }) => {
    onChoice(item.value === 'yes');
  };

  return (
    <Box flexDirection="column" padding={2}>
      <Box marginBottom={2}>
        <Text bold color="green">Hi {username}! 👋</Text>
      </Box>

      <Box
        borderStyle="single"
        borderColor="green"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width={70}
        marginBottom={2}
      >
        <Box marginBottom={1}>
          <Text color="yellow" bold>Want to see how you improved?</Text>
        </Box>
        <Box marginBottom={1}>
          <Text color="white">Compare your 2025 stats with 2024 to see your growth!</Text>
        </Box>
        <Box>
          <Text color="green" dimColor>(This will fetch additional data and may take longer)</Text>
        </Box>
      </Box>

      <Box flexDirection="column">
        <SelectInput items={menuItems} onSelect={handleMenuSelect} />
      </Box>
    </Box>
  );
}

interface StatsDisplayProps {
  stats: WrappedStats;
  onExport: (format?: 'png' | 'svg' | 'gif') => Promise<void>;
  onExit: () => void;
  onShare?: (platform: 'twitter' | 'linkedin') => Promise<void>;
  comparisonStats?: ComparisonStats | null;
  boxWidth?: number;
  verticalPadding?: number;
}

function generateContributionHeatmap(contributions: any[]): string[] {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const heatmap: string[] = [];

  // Group by month
  const monthlyData: { [key: string]: number[] } = {};

  for (const contrib of contributions) {
    const date = new Date(contrib.date);
    const month = months[date.getMonth()];
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(contrib.count);
  }

  // Generate visual for first 6 months
  for (let i = 0; i < 6; i++) {
    const month = months[i];
    const data = monthlyData[month] || [];
    const visual = data.slice(0, 12).map(count => {
      if (count === 0) return '░';
      if (count <= 2) return '▓';
      return '█';
    }).join('');
    heatmap.push(`${month} ${visual.padEnd(12, '░')}`);
  }

  return heatmap;
}

// Individual Slide Components
function ContributionsSlide({ stats }: { stats: WrappedStats }) {
  const animatedCount = useCountUp(stats.totalCommits, 1500);

  // Bold ASCII art for "OVERVIEW"
  const titleArt = [
    ' ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗██╗███████╗██╗    ██╗',
    '██╔═══██╗██║   ██║██╔════╝██╔══██╗██║   ██║██║██╔════╝██║    ██║',
    '██║   ██║██║   ██║█████╗  ██████╔╝██║   ██║██║█████╗  ██║ █╗ ██║',
    '██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚██╗ ██╔╝██║██╔══╝  ██║███╗██║',
    '╚██████╔╝ ╚████╔╝ ███████╗██║  ██║ ╚████╔╝ ██║███████╗╚███╔███╔╝',
    ' ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝ '
  ];

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* Username */}
      <Box marginBottom={1}>
        <Text color="green" bold>@{stats.user.login.toUpperCase()}</Text>
      </Box>

      {/* Date Range */}
      <Box marginBottom={1}>
        <Text color="gray" dimColor>{stats.dateRange}</Text>
      </Box>

      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Main headline */}
      <Box marginBottom={1}>
        <Text color="white" bold>IN {stats.year}, YOU MADE</Text>
      </Box>

      {/* Big number - centered, larger and bolder */}
      <Box marginBottom={2}>
        <Text color="green" bold>
          {formatNumber(animatedCount)} COMMITS
        </Text>
      </Box>

      {/* Stats box - centered with border */}
      <Box borderStyle="round" borderColor="green" paddingX={4} paddingY={1}>
        <Box flexDirection="column" width={65}>
          {/* Total Commits - Green */}
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="gray" dimColor>💻  Total Commits</Text>
            <Text color="green" bold>{formatNumber(stats.totalCommits)}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray" dimColor>{'─'.repeat(65)}</Text>
          </Box>

          {/* Pull Requests - Magenta */}
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="gray" dimColor>📊  Pull Requests</Text>
            <Text color="magenta" bold>{formatNumber(stats.totalPRs)}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray" dimColor>{'─'.repeat(65)}</Text>
          </Box>

          {/* Issues Opened - Yellow */}
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="gray" dimColor>🐛  Issues Opened</Text>
            <Text color="yellow" bold>{formatNumber(stats.totalIssues)}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="gray" dimColor>{'─'.repeat(65)}</Text>
          </Box>

          {/* Daily Average - Red/Orange */}
          <Box flexDirection="row" justifyContent="space-between">
            <Text color="gray" dimColor>🔥  Daily Average</Text>
            <Text color="red" bold>{stats.avgCommitsPerDay.toFixed(1)} commits/day</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function LanguagesSlide({ stats }: { stats: WrappedStats }) {
  const topLangs = stats.topLanguages.slice(0, 5);
  const colors = ['#FF6B6B', '#FFA500', '#FFD700', '#4ECDC4', '#4A9EFF'];

  // Bold ASCII art for "LANGUAGES"
  const titleArt = [
    '██╗      █████╗ ███╗   ██╗ ██████╗ ███████╗',
    '██║     ██╔══██╗████╗  ██║██╔════╝ ██╔════╝',
    '██║     ███████║██╔██╗ ██║██║  ███╗███████╗',
    '██║     ██╔══██║██║╚██╗██║██║   ██║╚════██║',
    '███████╗██║  ██║██║ ╚████║╚██████╔╝███████║',
    '╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝'
  ];

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Subtitle */}
      <Box marginBottom={1}>
        <Text color="white" dimColor>Most used in {stats.year}</Text>
      </Box>

      {/* Language bars - centered */}
      <Box flexDirection="column" width={70}>
        {topLangs.map((lang, i) => (
          <LanguageBar
            key={lang.name}
            name={lang.name}
            percentage={lang.percentage}
            color={colors[i]}
            delay={i * 100}
          />
        ))}
      </Box>
    </Box>
  );
}

// Helper component for animated language bar
function LanguageBar({ name, percentage, color, delay }: { name: string, percentage: number, color: string, delay: number }) {
  const animatedProgress = useProgressBar(percentage, delay, 800);
  const barWidth = 60;
  const filledBlocks = Math.floor((animatedProgress / 100) * barWidth);
  const emptyBlocks = barWidth - filledBlocks;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" justifyContent="space-between">
        <Text color="white" bold>{name}</Text>
        <Text color={color} bold>{animatedProgress.toFixed(1)}%</Text>
      </Box>
      <Box>
        <Text color={color}>{'█'.repeat(filledBlocks)}</Text>
        <Text color="gray" dimColor>{'░'.repeat(emptyBlocks)}</Text>
      </Box>
    </Box>
  );
}

function ArchetypeSlide({ stats }: { stats: WrappedStats }) {
  // Bold ASCII art for "PROFILE"
  const titleArt = [
    '██████╗ ██████╗  ██████╗ ███████╗██╗██╗     ███████╗',
    '██╔══██╗██╔══██╗██╔═══██╗██╔════╝██║██║     ██╔════╝',
    '██████╔╝██████╔╝██║   ██║█████╗  ██║██║     █████╗  ',
    '██╔═══╝ ██╔══██╗██║   ██║██╔══╝  ██║██║     ██╔══╝  ',
    '██║     ██║  ██║╚██████╔╝██║     ██║███████╗███████╗',
    '╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚══════╝'
  ];

  const isNocturnal = stats.peakHour >= 22 || stats.peakHour <= 5;
  const pulseState = usePulse(200); // Pulse every 200ms

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Title */}
      <Box marginBottom={1}>
        <Text color="gray" dimColor>YOU ARE A</Text>
      </Box>

      {/* Archetype name - bigger and more colorful */}
      <Box marginBottom={1}>
        <Text color="magenta" bold>{stats.archetype.name.toUpperCase()}</Text>
      </Box>

      {/* Visual separator */}
      <Box marginBottom={1}>
        <Text color="gray" dimColor>{'─'.repeat(50)}</Text>
      </Box>

      {/* Description - centered, split into lines */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {stats.archetype.description.split('. ').map((line, i) => (
          <Text key={i} color="white">{line}{i < stats.archetype.description.split('. ').length - 1 ? '.' : ''}</Text>
        ))}
      </Box>

      {/* Visual separator */}
      <Box marginBottom={1}>
        <Text color="gray" dimColor>{'─'.repeat(50)}</Text>
      </Box>

      {/* Type badge - enhanced with color coding and pulsing */}
      <Box
        borderStyle="round"
        borderColor={isNocturnal ? "magenta" : "yellow"}
        paddingX={2}
        paddingY={1}
      >
        <Text
          color={pulseState === 3 ? "gray" : (isNocturnal ? "magenta" : "yellow")}
          bold={pulseState === 0 || pulseState === 1}
          dimColor={pulseState === 2 || pulseState === 4}
        >
          {isNocturnal ? '🌙  NOCTURNAL CODER' : '☀️  DAYTIME CODER'}
        </Text>
      </Box>
    </Box>
  );
}

function StreakSlide({ stats }: { stats: WrappedStats }) {
  const animatedStreak = useCountUp(stats.longestStreak, 1200);

  // Bold ASCII art for "ACTIVITY"
  const titleArt = [
    ' █████╗  ██████╗████████╗██╗██╗   ██╗██╗████████╗██╗   ██╗',
    '██╔══██╗██╔════╝╚══██╔══╝██║██║   ██║██║╚══██╔══╝╚██╗ ██╔╝',
    '███████║██║        ██║   ██║██║   ██║██║   ██║    ╚████╔╝ ',
    '██╔══██║██║        ██║   ██║╚██╗ ██╔╝██║   ██║     ╚██╔╝  ',
    '██║  ██║╚██████╗   ██║   ██║ ╚████╔╝ ██║   ██║      ██║   ',
    '╚═╝  ╚═╝ ╚═════╝   ╚═╝   ╚═╝  ╚═══╝  ╚═╝   ╚═╝      ╚═╝   '
  ];

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Subtitle */}
      <Box marginBottom={1}>
        <Text color="white" bold>YOUR LONGEST STREAK</Text>
      </Box>

      {/* Big number */}
      <Box marginBottom={1}>
        <Text bold color="orange">
          {animatedStreak} DAYS
        </Text>
      </Box>

      {/* Stats box */}
      <Box borderStyle="round" borderColor="green" paddingX={4} paddingY={1} marginTop={1}>
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan">⏰ Peak Hour: </Text>
            <Text color="green" bold>{formatHour(stats.peakHour)}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="cyan">📅 Busiest Day: </Text>
            <Text color="green" bold>{stats.busiestDay}</Text>
          </Box>
          <Box>
            <Text color="cyan">🎯 Most Active Repo: </Text>
            <Text color="green" bold>{stats.mostActiveRepo}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// NEW SLIDE: PRs & Issues
function PRsAndIssuesSlide({ stats }: { stats: WrappedStats }) {
  const animatedPRs = useCountUp(stats.totalPRs, 1000);
  const animatedIssues = useCountUp(stats.totalIssues, 1000);

  // Bold ASCII art for "CONTRIBS"
  const titleArt = [
    ' ██████╗ ███████╗███╗   ██╗████████╗██████╗ ██╗██████╗ ███████╗',
    '██╔════╝██╔═══██║████╗  ██║╚══██╔══╝██╔══██╗██║██╔══██╗██╔════╝',
    '██║     ██║   ██║██╔██╗ ██║   ██║   ██████╔╝██║██████╔╝███████╗',
    '██║     ██║   ██║██║╚██╗██║   ██║   ██╔══██╗██║██╔══██╗╚════██║',
    '╚██████╗╚██████╔╝██║ ╚████║   ██║   ██║  ██║██║██████╔╝███████║',
    ' ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═════╝ ╚══════╝'
  ];

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Subtitle */}
      <Box marginBottom={1}>
        <Text color="white" bold>PULL REQUESTS & ISSUES</Text>
      </Box>

      {/* Stats Boxes */}
      <Box flexDirection="row" gap={4} marginY={1}>
        <Box borderStyle="round" borderColor="magenta" paddingX={3} paddingY={1}>
          <Box flexDirection="column" alignItems="center">
            <Text bold color="magenta">{formatNumber(animatedPRs)}</Text>
            <Text color="gray" dimColor>PULL REQ</Text>
          </Box>
        </Box>

        <Box borderStyle="round" borderColor="cyan" paddingX={3} paddingY={1}>
          <Box flexDirection="column" alignItems="center">
            <Text bold color="cyan">{formatNumber(animatedIssues)}</Text>
            <Text color="gray" dimColor>ISSUES</Text>
          </Box>
        </Box>
      </Box>

      {/* Details */}
      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text color="green">Contributions to collaboration</Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>Building better code, one PR at a time</Text>
        </Box>
      </Box>
    </Box>
  );
}

function AchievementsSlide({ stats }: { stats: WrappedStats }) {
  // Helper to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  // Helper to get icon based on programming language
  const getLanguageIcon = (language: string | null) => {
    if (!language) return '📁';

    const lang = language.toLowerCase();
    if (lang.includes('javascript')) return '📘';
    if (lang.includes('typescript')) return '📘';
    if (lang.includes('python')) return '🐍';
    if (lang.includes('go')) return '🔧';
    if (lang.includes('java')) return '☕';
    if (lang.includes('rust')) return '🦀';
    if (lang.includes('c++') || lang.includes('cpp')) return '⚙️';
    if (lang.includes('ruby')) return '💎';
    if (lang.includes('php')) return '🐘';
    return '📁';
  };

  // Bold ASCII art for "PROJECTS"
  const titleArt = [
    '██████╗ ██████╗  ██████╗      ██╗███████╗ ██████╗████████╗███████╗',
    '██╔══██╗██╔══██╗██╔═══██╗     ██║██╔════╝██╔════╝╚══██╔══╝██╔════╝',
    '██████╔╝██████╔╝██║   ██║     ██║█████╗  ██║        ██║   ███████╗',
    '██╔═══╝ ██╔══██╗██║   ██║██   ██║██╔══╝  ██║        ██║   ╚════██║',
    '██║     ██║  ██║╚██████╔╝╚█████╔╝███████╗╚██████╗   ██║   ███████║',
    '╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚════╝ ╚══════╝ ╚═════╝   ╚═╝   ╚══════╝'
  ];

  const topRepos = stats.topRepos.slice(0, 5);
  const username = stats.user.login;

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Header Bar */}
      <Box borderStyle="single" borderColor="green" paddingX={2} width={60}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color="green" bold>/{username.toUpperCase()}/PROJECTS</Text>
          <Text color="green" bold>[X]</Text>
        </Box>
      </Box>

      {/* Repository List - Table Style */}
      <Box borderStyle="single" borderColor="green" paddingX={2} width={60}>
        <Box flexDirection="column">
          {topRepos.map((repo, index) => (
            <Box key={repo.name} flexDirection="column">
              <Box flexDirection="row" justifyContent="space-between" alignItems="center" paddingY={0}>
                {/* Left: Icon + Name */}
                <Box flexDirection="row" alignItems="center" gap={1}>
                  <Text>{getLanguageIcon(repo.language)}</Text>
                  <Text color="green" bold>{truncateText(repo.name.toUpperCase(), 30)}</Text>
                </Box>

                {/* Right: Rank Badge */}
                <Box borderStyle="single" borderColor="yellow" paddingX={1}>
                  <Text color="yellow" bold>#{index + 1}</Text>
                </Box>
              </Box>

              {/* Horizontal separator */}
              {index < topRepos.length - 1 && (
                <Text color="gray" dimColor>{'─'.repeat(52)}</Text>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ComparisonSlide({ comparisonStats }: { comparisonStats: ComparisonStats }) {
  const { year2024, year2025, growth } = comparisonStats;
  const prevYear = year2024.year;
  const currYear = year2025.year;

  // Animate growth percentages
  const commitsGrowth = useCountUp(growth.commits, 1500);
  const prsGrowth = useCountUp(growth.prs, 1500);
  const issuesGrowth = useCountUp(growth.issues, 1500);
  const streakGrowth = useCountUp(growth.streak, 1500);

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'green';
    if (value < 0) return 'red';
    return 'yellow';
  };

  const getGrowthSymbol = (value: number) => {
    if (value > 0) return '↗';
    if (value < 0) return '↘';
    return '→';
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box marginBottom={1}>
        <Text color="cyan" bold>📊 YEAR OVER YEAR COMPARISON</Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="white" dimColor>{prevYear} vs {currYear} - Your Growth Story</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} width={85}>
        {/* Commits Comparison */}
        <Box marginY={1} borderStyle="round" borderColor="green" paddingX={2} flexDirection="row" justifyContent="space-between">
          <Text color="white">💻 Commits:</Text>
          <Box>
            <Text color="gray" dimColor>{year2024.totalCommits}</Text>
            <Text color="white"> → </Text>
            <Text color="green" bold>{year2025.totalCommits}</Text>
            <Text color={getGrowthColor(commitsGrowth)}> ({commitsGrowth > 0 ? '+' : ''}{commitsGrowth}% {getGrowthSymbol(commitsGrowth)})</Text>
          </Box>
        </Box>

        {/* PRs Comparison */}
        <Box marginY={1} borderStyle="round" borderColor="green" paddingX={2} flexDirection="row" justifyContent="space-between">
          <Text color="white">🔀 PRs:</Text>
          <Box>
            <Text color="gray" dimColor>{year2024.totalPRs}</Text>
            <Text color="white"> → </Text>
            <Text color="green" bold>{year2025.totalPRs}</Text>
            <Text color={getGrowthColor(prsGrowth)}> ({prsGrowth > 0 ? '+' : ''}{prsGrowth}% {getGrowthSymbol(prsGrowth)})</Text>
          </Box>
        </Box>

        {/* Issues Comparison */}
        <Box marginY={1} borderStyle="round" borderColor="green" paddingX={2} flexDirection="row" justifyContent="space-between">
          <Text color="white">🐛 Issues:</Text>
          <Box>
            <Text color="gray" dimColor>{year2024.totalIssues}</Text>
            <Text color="white"> → </Text>
            <Text color="green" bold>{year2025.totalIssues}</Text>
            <Text color={getGrowthColor(issuesGrowth)}> ({issuesGrowth > 0 ? '+' : ''}{issuesGrowth}% {getGrowthSymbol(issuesGrowth)})</Text>
          </Box>
        </Box>

        {/* Streak Comparison */}
        <Box marginY={1} borderStyle="round" borderColor="green" paddingX={2} flexDirection="row" justifyContent="space-between">
          <Text color="white">🔥 Streak:</Text>
          <Box>
            <Text color="gray" dimColor>{year2024.longestStreak}</Text>
            <Text color="white"> → </Text>
            <Text color="green" bold>{year2025.longestStreak}</Text>
            <Text color={getGrowthColor(streakGrowth)}> ({streakGrowth > 0 ? '+' : ''}{streakGrowth}% {getGrowthSymbol(streakGrowth)})</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function ExportSlide({ stats }: { stats: WrappedStats }) {
  // Bold ASCII art for "EXPORT"
  const titleArt = [
    '███████╗██╗  ██╗██████╗  ██████╗ ██████╗ ████████╗',
    '██╔════╝╚██╗██╔╝██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝',
    '█████╗   ╚███╔╝ ██████╔╝██║   ██║██████╔╝   ██║   ',
    '██╔══╝   ██╔██╗ ██╔═══╝ ██║   ██║██╔══██╗   ██║   ',
    '███████╗██╔╝ ██╗██║     ╚██████╔╝██║  ██║   ██║   ',
    '╚══════╝╚═╝  ╚═╝╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   '
  ];

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* ASCII Title */}
      <Box marginBottom={1} flexDirection="column" alignItems="center">
        {titleArt.map((line, i) => (
          <Text key={i} color="cyan" bold>{line}</Text>
        ))}
      </Box>

      {/* Subtitle */}
      <Box marginBottom={1}>
        <Text color="white" bold>READY TO EXPORT?</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="white">
          {formatNumber(stats.totalCommits)} commits • {formatNumber(stats.totalPRs)} PRs • {formatNumber(stats.totalRepos)} repos
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="green" dimColor>
          {formatNumber(stats.totalIssues)} issues • {(stats.totalLinesChanged / 1000).toFixed(0)}K lines changed
        </Text>
      </Box>

      {/* Letter key shortcuts menu */}
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={3} paddingY={1} width={60}>
        <Box marginBottom={1}>
          <Text color="cyan" dimColor>Press a key:</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="cyan" bold>[E] </Text>
          <Text color="white">Export as PNG</Text>
        </Box>

        <Box>
          <Text color="red" bold>[Q] </Text>
          <Text color="white">Exit</Text>
        </Box>
      </Box>
    </Box>
  );
}

function FarewellSlide({ stats, action }: { stats: WrappedStats; action?: string }) {
  const [showMessage, setShowMessage] = useState(false);
  const [rainColumns, setRainColumns] = useState<Array<{ x: number; y: number; speed: number; numbers: string[] }>>([]);

  // Initialize rain columns
  useEffect(() => {
    const columns = [];
    const numColumns = 100; // Number of rain columns (increased for better coverage)
    for (let i = 0; i < numColumns; i++) {
      columns.push({
        x: i,
        y: Math.floor(Math.random() * -30), // Start above screen
        speed: Math.random() * 2.4 + 1.2, // Random speed (3x faster)
        numbers: Array(15).fill(0).map(() => Math.floor(Math.random() * 10).toString())
      });
    }
    setRainColumns(columns);

    // Show message after 5 seconds
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Animate rain
  useEffect(() => {
    if (showMessage) return;

    const interval = setInterval(() => {
      setRainColumns(prev => prev.map(col => ({
        ...col,
        y: col.y + col.speed,
        // Reset if too far down
        ...(col.y > 35 ? {
          y: Math.floor(Math.random() * -15),
          numbers: Array(15).fill(0).map(() => Math.floor(Math.random() * 10).toString())
        } : {})
      })));
    }, 16);

    return () => clearInterval(interval);
  }, [showMessage]);

  // Show final message
  if (showMessage) {
    // ASCII art for "2025"
    const year2025Art = [
      '██████╗  ██████╗ ██████╗ ███████╗',
      '╚════██╗██╔═████╗╚════██╗██╔════╝',
      ' █████╔╝██║██╔██║ █████╔╝███████╗',
      '██╔═══╝ ████╔╝██║██╔═══╝ ╚════██║',
      '███████╗╚██████╔╝███████╗███████║',
      '╚══════╝ ╚═════╝ ╚══════╝╚══════╝'
    ];

    // ASCII art for "WRAPPED"
    const wrappedArt = [
      '██╗    ██╗██████╗  █████╗ ██████╗ ██████╗ ███████╗██████╗ ',
      '██║    ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗',
      '██║ █╗ ██║██████╔╝███████║██████╔╝██████╔╝█████╗  ██║  ██║',
      '██║███╗██║██╔══██╗██╔══██║██╔═══╝ ██╔═══╝ ██╔══╝  ██║  ██║',
      '╚███╔███╔╝██║  ██║██║  ██║██║     ██║     ███████╗██████╔╝',
      ' ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚═════╝ '
    ];

    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
        {/* 2025 ASCII Art */}
        <Box marginBottom={1} flexDirection="column" alignItems="center">
          {year2025Art.map((line, i) => (
            <Text key={i} color="cyan" bold>{line}</Text>
          ))}
        </Box>

        {/* WRAPPED ASCII Art */}
        <Box marginBottom={1} flexDirection="column" alignItems="center">
          {wrappedArt.map((line, i) => (
            <Text key={i} color="magenta" bold>{line}</Text>
          ))}
        </Box>

        {/* Divider */}
        <Box marginBottom={1}>
          <Text color="gray">─────────────────────────────────────────────────────</Text>
        </Box>

        {/* See you in 2026 */}
        <Box marginBottom={1} justifyContent="center">
          <Text color="green" bold>SEE YOU IN 2026</Text>
        </Box>

        {/* Exit button */}
        <Box marginBottom={2} justifyContent="center">
          <Text color="green">[   Press ENTER to exit   ]</Text>
        </Box>

        {/* Footer credit */}
        <Box marginTop={2} justifyContent="center">
          <Text color="gray" dimColor>Crafted by d3varaja</Text>
        </Box>
      </Box>
    );
  }

  // Number rain animation
  return (
    <Box flexDirection="column" width="100%" height={35}>
      {Array(35).fill(0).map((_, row) => (
        <Box key={row} flexDirection="row">
          {rainColumns.map((col, colIndex) => {
            const relativePos = row - Math.floor(col.y);
            if (relativePos >= 0 && relativePos < col.numbers.length) {
              // Purple gradient based on position in trail (brighter at top, dimmer below)
              let color = 'magenta';
              let dimColor = false;

              if (relativePos === 0) {
                // Brightest at the head
                color = 'magenta';
                dimColor = false;
              } else if (relativePos <= 3) {
                // Medium bright
                color = 'magenta';
                dimColor = false;
              } else if (relativePos <= 7) {
                // Slightly dimmed
                color = 'magenta';
                dimColor = true;
              } else {
                // Very dim at tail
                color = 'blue';
                dimColor = true;
              }

              return (
                <Text
                  key={colIndex}
                  color={color}
                  dimColor={dimColor}
                >
                  {col.numbers[relativePos]}
                </Text>
              );
            }
            return <Text key={colIndex}> </Text>;
          })}
        </Box>
      ))}
    </Box>
  );
}

// Main Slideshow Component
export function StatsDisplay({ stats, onExport, onExit, onShare, comparisonStats, boxWidth: propBoxWidth, verticalPadding: propVerticalPadding }: StatsDisplayProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [actionTaken, setActionTaken] = useState<string | null>(null);
  const [showFarewell, setShowFarewell] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportPath, setExportPath] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Use provided values or defaults
  const boxWidth = propBoxWidth || 100;
  const verticalPadding = propVerticalPadding || 1;
  const boxHeight = Math.floor(boxWidth * 0.5); // Same height calculation as landing pages

  // Enable stdin raw mode for arrow keys on Windows
  useEffect(() => {
    if (process.stdin.isTTY && process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    return () => {
      if (process.stdin.isTTY && process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };
  }, []);

  // Build slides array conditionally (memoized to prevent recreation on every render)
  const slides = useMemo(() => {
    const baseSlides = [
      <ContributionsSlide key="contrib" stats={stats} />,
      <LanguagesSlide key="langs" stats={stats} />,
      <ArchetypeSlide key="arch" stats={stats} />,
      <StreakSlide key="streak" stats={stats} />,
      <PRsAndIssuesSlide key="prs" stats={stats} />,
      <AchievementsSlide key="achieve" stats={stats} />,
    ];

    // Add comparison slide if data is available
    if (comparisonStats) {
      baseSlides.push(<ComparisonSlide key="comparison" comparisonStats={comparisonStats} />);
    }

    // Add export slide
    baseSlides.push(<ExportSlide key="export" stats={stats} />);

    return baseSlides;
  }, [stats, comparisonStats]);
  const totalSlides = slides.length;
  const exportSlideIndex = totalSlides - 1;

  useInput((input, key) => {
    // If showing export success, handle Enter to continue to farewell
    if (exportSuccess) {
      if (key.return) {
        setExportSuccess(false);
        setActionTaken('export');
        setShowFarewell(true);
      }
      return;
    }

    // If showing farewell slide, handle Enter to exit
    if (showFarewell) {
      if (key.return) {
        onExit();
      }
      return;
    }

    // If processing with error, allow retry with R
    if (isProcessing && exportError) {
      if (input === 'r' || input === 'R') {
        setExportError(null);
        setExportStatus('Initializing...');

        // Retry export with progress feedback
        (async () => {
          try {
            const { PlaywrightExporter } = await import('./export-playwright.js');
            const exporter = new PlaywrightExporter(stats);

            setExportStatus('Starting export...');
            const outputPath = await exporter.exportPNG((status: string) => {
              setExportStatus(status);
            });

            // Success - show success screen
            setExportPath(outputPath);
            setExportSuccess(true);
            setIsProcessing(false);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setExportError(errorMsg);
            setIsProcessing(false);
          }
        })();
      } else if (input === 'q' || input === 'Q') {
        onExit();
      }
      return;
    }

    // Prevent multiple actions while processing
    if (isProcessing) {
      return;
    }

    // If on export slide (last slide), handle letter key shortcuts
    if (currentSlide === exportSlideIndex) {
      if (input === 'e' || input === 'E') {
        setIsProcessing(true);
        setExportError(null);
        setExportStatus('Initializing...');

        // Execute export with progress feedback
        (async () => {
          try {
            const { PlaywrightExporter } = await import('./export-playwright.js');
            const exporter = new PlaywrightExporter(stats);

            setExportStatus('Starting export...');
            const outputPath = await exporter.exportPNG((status: string) => {
              setExportStatus(status);
            });

            // Success - show success screen
            setExportPath(outputPath);
            setExportSuccess(true);
            setIsProcessing(false);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            setExportError(errorMsg);
            setIsProcessing(false);
          }
        })();
      } else if (input === 'q' || input === 'Q') {
        onExit();
      } else if (key.leftArrow) {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
      return;
    }

    // Normal slide navigation
    if (key.rightArrow || input === ' ') {
      setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
    } else if (key.leftArrow) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    } else if (key.escape || input === '\x1b') {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" width="100%">
      {/* Main bordered box - Same structure as landing pages */}
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="green"
        paddingX={4}
        paddingY={1}
        width={boxWidth}
        height={boxHeight}
        alignItems="center"
        marginTop={verticalPadding}
      >
        {/* Slide content - Main content area with flexGrow */}
        <Box flexGrow={1} justifyContent="center" alignItems="center" width="100%">
          {exportSuccess ? (
            <Box flexDirection="column" alignItems="center" justifyContent="center">
              <Box marginBottom={2}>
                <Text color="green" bold>✓ Export successful!</Text>
              </Box>

              <Box
                borderStyle="round"
                borderColor="green"
                paddingX={2}
                paddingY={1}
                flexDirection="column"
                alignItems="center"
              >
                <Text color="white" bold>{exportPath.split(/[/\\]/).pop()}</Text>
                <Text color="dim" dimColor>{exportPath.split(/[/\\]/).slice(0, -1).join('/')}/</Text>
              </Box>

              <Box marginTop={2}>
                <Text color="dim">[Enter] Continue</Text>
              </Box>
            </Box>
          ) : isProcessing ? (
            <Box flexDirection="column" alignItems="center" justifyContent="center">
              <Text>
                <Text color="green">◉</Text>
                {' '}
                <Text color="cyan">{exportStatus || 'Processing...'}</Text>
              </Text>
              {exportError && (
                <Box marginTop={1} flexDirection="column" alignItems="center">
                  <Text color="red">✗ {exportError}</Text>
                  <Box marginTop={1}>
                    <Text color="dim">[R] Retry • [Q] Quit</Text>
                  </Box>
                </Box>
              )}
            </Box>
          ) : showFarewell ? (
            <FarewellSlide stats={stats} action={actionTaken || undefined} />
          ) : (
            slides[currentSlide]
          )}
        </Box>

        {/* Progress dots inside the box */}
        {!showFarewell && !exportSuccess && !isProcessing && (
          <Box justifyContent="center" marginBottom={1}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <Text key={i} color={i === currentSlide ? 'green' : 'gray'}>
                {i === currentSlide ? '■' : '□'}{' '}
              </Text>
            ))}
          </Box>
        )}

        {/* Navigation instructions inside the box */}
        {!showFarewell && !exportSuccess && !isProcessing && (
          <Box justifyContent="center">
            {currentSlide === exportSlideIndex ? (
              <Text color="cyan" dimColor>E: Export • T: Twitter • L: LinkedIn • Q: Skip • ESC: Exit</Text>
            ) : (
              <Text color="green" dimColor>← → to navigate • ESC to exit</Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ============================================
// ROOT APP COMPONENT - State Machine
// ============================================

interface GitHubWrappedAppProps {
  detectedUsername: string | null;
}

export function GitHubWrappedApp({ detectedUsername }: GitHubWrappedAppProps) {
  const [appState, setAppState] = useState<AppState>({
    phase: 'username_input',
    detectedUsername
  });

  // Get terminal dimensions
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 80;
  const termHeight = stdout?.rows || 24;

  // Calculate box dimensions (same as UsernameInput)
  const usableWidth = Math.floor(termWidth * 0.98);
  const usableHeight = Math.floor(termHeight * 0.98);

  let boxWidth = usableWidth;
  let boxHeight = Math.floor(boxWidth * 0.5);

  if (boxHeight > usableHeight) {
    boxHeight = usableHeight;
    boxWidth = Math.floor(boxHeight * 2);
  }

  boxWidth = Math.max(boxWidth, 80);
  const verticalPadding = Math.max(1, Math.floor((termHeight - boxHeight - 4) / 2));

  // Handle username submission
  const handleUsernameSubmit = (username: string) => {
    setAppState({
      phase: 'fetching_data',
      username,
      token: process.env.GITHUB_TOKEN,
      message: 'Initializing...'
    });
  };

  // Handle token submission
  const handleTokenSubmit = (token: string) => {
    if (appState.phase === 'token_request') {
      setAppState({
        phase: 'fetching_data',
        username: appState.username,
        token,
        message: 'Validating token and fetching data...'
      });
    }
  };

  // Data fetching effect
  useEffect(() => {
    if (appState.phase !== 'fetching_data') return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        const client = new GitHubGraphQLClient(appState.username, appState.token);
        const analyzer = new StatsAnalyzer();

        const selectedYear = new Date().getFullYear();
        const startDate = new Date(`${selectedYear}-01-01`);
        const endDate = new Date();
        const dateRangeStr = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

        if (!cancelled) {
          setAppState({
            phase: 'fetching_data',
            username: appState.username,
            token: appState.token,
            message: `Fetching GitHub data for ${selectedYear}...`
          });
        }

        const [user, repos, languageStats, commits, totalPRs, totalIssues, contributions, realLinesChanged, accurateCommitCount] = await Promise.all([
          client.getUser(),
          client.getRepositories(),
          client.getLanguages(),
          client.getCommitsForYear(selectedYear),
          client.getPullRequests(selectedYear),
          client.getIssues(selectedYear),
          client.getContributionCalendar(selectedYear),
          client.getTotalLinesChanged(selectedYear),
          client.getTotalCommitCount(selectedYear)
        ]);

        if (!cancelled) {
          setAppState({
            phase: 'fetching_data',
            username: appState.username,
            token: appState.token,
            message: 'Generating your wrapped with REAL data...'
          });
        }

        const stats = await analyzer.generateWrappedStats(
          user,
          commits,
          repos,
          languageStats,
          contributions,
          totalPRs,
          totalIssues,
          realLinesChanged,
          selectedYear,
          dateRangeStr,
          accurateCommitCount
        );

        if (!cancelled) {
          setAppState({
            phase: 'stats_display',
            stats,
            comparisonStats: undefined
          });
        }
      } catch (err: any) {
        if (cancelled) return;

        // Handle errors
        if (err.message.includes('rate limit') || err.message.includes('403')) {
          setAppState({
            phase: 'token_request',
            username: appState.username,
            error: undefined
          });
        } else if (err.message.includes('Bad credentials')) {
          setAppState({
            phase: 'token_request',
            username: appState.username,
            error: 'Invalid token. Please try again.'
          });
        } else {
          setAppState({
            phase: 'error',
            error: err.message
          });
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [appState.phase, appState.phase === 'fetching_data' ? appState.username : null, appState.phase === 'fetching_data' ? appState.token : null]);

  if (appState.phase === 'username_input') {
    return (
      <UsernameInput
        onSubmit={handleUsernameSubmit}
        detectedUsername={appState.detectedUsername}
      />
    );
  }

  if (appState.phase === 'fetching_data') {
    return (
      <Box flexDirection="column" alignItems="center" width="100%">
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor="green"
          paddingX={4}
          paddingY={1}
          width={boxWidth}
          height={boxHeight}
          alignItems="center"
          marginTop={verticalPadding}
        >
          <LoadingScreen message={appState.message} />
        </Box>
      </Box>
    );
  }

  if (appState.phase === 'token_request') {
    return (
      <Box flexDirection="column" alignItems="center" width="100%">
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor="green"
          paddingX={4}
          paddingY={1}
          width={boxWidth}
          height={boxHeight}
          alignItems="center"
          marginTop={verticalPadding}
        >
          <TokenInput
            onSubmit={handleTokenSubmit}
            onSkip={() => process.exit(0)}
            error={appState.error}
          />
        </Box>
      </Box>
    );
  }

  if (appState.phase === 'stats_display') {
    return (
      <StatsDisplay
        stats={appState.stats}
        comparisonStats={appState.comparisonStats}
        onExit={() => process.exit(0)}
        onExport={async () => {
          // Export logic moved to StatsDisplay component for better state management
        }}
        onShare={async () => {}}
        boxWidth={boxWidth}
        verticalPadding={verticalPadding}
      />
    );
  }

  if (appState.phase === 'error') {
    return (
      <Box flexDirection="column" alignItems="center" width="100%">
        <Box
          flexDirection="column"
          borderStyle="double"
          borderColor="red"
          paddingX={4}
          paddingY={1}
          width={boxWidth}
          height={boxHeight}
          alignItems="center"
          marginTop={verticalPadding}
        >
          <Text color="red" bold>✗ Error</Text>
          <Text color="red">{appState.error}</Text>
          <Text color="gray" dimColor>Press Ctrl+C to exit</Text>
        </Box>
      </Box>
    );
  }

  return null;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
