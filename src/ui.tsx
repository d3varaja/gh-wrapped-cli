import React, { useState, useEffect } from 'react';
import { Box, Text, Newline, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import chalk from 'chalk';
import type { WrappedStats, ComparisonStats } from './types.js';

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

// Hook 2: Progress bar animation (disabled for stability)
function useProgressBar(targetPercentage: number, delay: number = 0, duration: number = 800) {
  // Return target immediately without animation to prevent re-render loop
  return targetPercentage;
}

// Hook 3: Staggered reveal for list items (disabled for stability)
function useStaggeredReveal(totalItems: number, delayBetween: number = 150) {
  // Return total immediately without animation to prevent re-render loop
  return totalItems;
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

  const menuItems = [
    { label: `✓ Use detected: ${detectedUsername}`, value: 'detected' },
    { label: '✏️  Enter manually', value: 'manual' },
  ];

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

  // Show menu only if we have a detected username and user hasn't chosen manual entry
  const showMenu = detectedUsername && !manualEntry;

  return (
    <Box flexDirection="column" padding={2}>
      {/* Title - ASCII Art */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="green">  ██████  ██ ████████ ██   ██ ██    ██ ██████  </Text>
        <Text bold color="green"> ██       ██    ██    ██   ██ ██    ██ ██   ██ </Text>
        <Text bold color="green"> ██   ███ ██    ██    ███████ ██    ██ ██████  </Text>
        <Text bold color="green"> ██    ██ ██    ██    ██   ██ ██    ██ ██   ██ </Text>
        <Text bold color="green">  ██████  ██    ██    ██   ██  ██████  ██████  </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text bold color="green"> ██     ██ ██████   █████  ██████  ██████  ███████ ██████  </Text>
        <Text bold color="green"> ██     ██ ██   ██ ██   ██ ██   ██ ██   ██ ██      ██   ██ </Text>
        <Text bold color="green"> ██  █  ██ ██████  ███████ ██████  ██████  █████   ██   ██ </Text>
        <Text bold color="green"> ██ ███ ██ ██   ██ ██   ██ ██      ██      ██      ██   ██ </Text>
        <Text bold color="green">  ███ ███  ██   ██ ██   ██ ██      ██      ███████ ██████  </Text>
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
        width={60}
      >
        {error && (
          <Box marginBottom={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}

        {showMenu ? (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color="green">&gt; Select GitHub username</Text>
            </Box>
            <Box marginBottom={1}>
              <Text color="cyan" dimColor>Use ↑↓ arrows to select, Enter to confirm</Text>
            </Box>
            <SelectInput items={menuItems} onSelect={handleMenuSelect} />
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
  onExport: (format?: 'png' | 'svg' | 'gif') => void;
  onExit: () => void;
  onShare?: (platform: 'twitter' | 'linkedin') => void;
  comparisonStats?: ComparisonStats | null;
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

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* Username */}
      <Box marginBottom={2}>
        <Text color="green" dimColor>@{stats.user.login.toUpperCase()}</Text>
      </Box>

      {/* Main headline */}
      <Box marginBottom={1}>
        <Text color="white" bold>IN 2025, YOU MADE</Text>
      </Box>

      {/* Big number - centered */}
      <Box marginBottom={3}>
        <Text color="green" bold>
          {animatedCount} COMMITS
        </Text>
      </Box>

      {/* Stats box - centered with border */}
      <Box borderStyle="round" borderColor="green" paddingX={4} paddingY={1}>
        <Box flexDirection="column" width={60}>
          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="cyan">💻 Total Commits</Text>
            <Text color="green" bold>{stats.totalCommits}</Text>
          </Box>

          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="cyan">📊 Pull Requests</Text>
            <Text color="green" bold>{stats.totalPRs}</Text>
          </Box>

          <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
            <Text color="cyan">🐛 Issues Opened</Text>
            <Text color="green" bold>{stats.totalIssues}</Text>
          </Box>

          <Box flexDirection="row" justifyContent="space-between">
            <Text color="cyan">🔥 Daily Average</Text>
            <Text color="green" bold>{stats.avgCommitsPerDay.toFixed(1)} commits/day</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function LanguagesSlide({ stats }: { stats: WrappedStats }) {
  const topLangs = stats.topLanguages.slice(0, 5);
  const colors = ['#FF6B6B', '#FFA500', '#FFD700', '#4ECDC4', '#4A9EFF'];

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* Title */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>💻 YOUR TOP LANGUAGES</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="white" dimColor>Most used in 2025</Text>
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
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* Emoji */}
      <Box marginBottom={3}>
        <Text>{stats.archetype.emoji}</Text>
      </Box>

      {/* Title */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>YOU ARE A</Text>
      </Box>

      {/* Archetype name */}
      <Box marginBottom={2}>
        <Text color="green" bold>{stats.archetype.name.toUpperCase()}</Text>
      </Box>

      {/* Description - centered with max width */}
      <Box marginBottom={3} width={70}>
        <Text color="white" dimColor>{stats.archetype.description}</Text>
      </Box>

      {/* Type badge */}
      <Box borderStyle="round" borderColor="green" paddingX={3} paddingY={0}>
        <Text color="green">
          {stats.peakHour >= 22 || stats.peakHour <= 5 ? '🌙 NOCTURNAL CODER' : '☀️ DAYTIME CODER'}
        </Text>
      </Box>
    </Box>
  );
}

function StreakSlide({ stats }: { stats: WrappedStats }) {
  const animatedStreak = useCountUp(stats.longestStreak, 1200);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      {/* Title */}
      <Box marginBottom={2}>
        <Text color="cyan" bold>🔥 YOUR LONGEST STREAK</Text>
      </Box>

      {/* Big number */}
      <Box marginBottom={1}>
        <Text bold color="orange">
          {animatedStreak} DAYS
        </Text>
      </Box>

      {/* Stats box */}
      <Box borderStyle="round" borderColor="green" paddingX={4} paddingY={1} marginTop={3}>
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

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box marginBottom={1}>
        <Text color="green" bold>PULL REQUESTS & ISSUES</Text>
      </Box>

      {/* Stats Boxes */}
      <Box flexDirection="row" gap={4} marginY={2}>
        <Box borderStyle="round" borderColor="magenta" paddingX={3} paddingY={1}>
          <Box flexDirection="column" alignItems="center">
            <Text bold color="magenta">{animatedPRs}</Text>
            <Text color="gray" dimColor>PULL REQ</Text>
          </Box>
        </Box>

        <Box borderStyle="round" borderColor="cyan" paddingX={3} paddingY={1}>
          <Box flexDirection="column" alignItems="center">
            <Text bold color="cyan">{animatedIssues}</Text>
            <Text color="gray" dimColor>ISSUES</Text>
          </Box>
        </Box>
      </Box>

      {/* Details */}
      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text color="green">📊 Contributions to collaboration</Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>Building better code, one PR at a time</Text>
        </Box>
      </Box>
    </Box>
  );
}

// NEW SLIDE: Stars & Impact
function StarsSlide({ stats }: { stats: WrappedStats }) {
  const animatedStars = useCountUp(stats.totalStars, 1200);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box marginBottom={1}>
        <Text color="green" bold>YOUR IMPACT</Text>
      </Box>

      <Box marginY={2}>
        <Text bold color="yellow">⭐ {animatedStars} ⭐</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="cyan" bold>TOTAL STARS</Text>
      </Box>

      <Box flexDirection="column" marginTop={2}>
        <Box marginBottom={1}>
          <Text color="green">🌟 Across {stats.totalRepos} repositories</Text>
        </Box>
        <Box>
          <Text color="gray" dimColor>Your code inspired {animatedStars} developers!</Text>
        </Box>
      </Box>
    </Box>
  );
}

function AchievementsSlide({ stats }: { stats: WrappedStats }) {
  const displayedAchievements = stats.achievements.slice(0, 5);
  const visibleCount = useStaggeredReveal(displayedAchievements.length, 150);

  // Helper to get rarity color and symbol
  const getRarityDisplay = (rarity: string) => {
    switch (rarity) {
      case 'mythic':
        return { color: 'magenta', symbol: '✨', label: 'MYTHIC' };
      case 'legendary':
        return { color: 'yellow', symbol: '🟠', label: 'LEGENDARY' };
      case 'epic':
        return { color: 'magenta', symbol: '🟣', label: 'EPIC' };
      case 'rare':
        return { color: 'blue', symbol: '🔵', label: 'RARE' };
      case 'common':
        return { color: 'white', symbol: '⚪', label: 'COMMON' };
      default:
        return { color: 'white', symbol: '⚪', label: 'COMMON' };
    }
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box marginBottom={1}>
        <Text color="yellow" bold>🏆 ACHIEVEMENTS UNLOCKED</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="green" dimColor>{stats.achievements.length} total badges earned</Text>
      </Box>

      <Box flexDirection="column" marginTop={1} width={85}>
        {displayedAchievements.slice(0, visibleCount).map((achievement) => {
          const rarityInfo = getRarityDisplay(achievement.rarity);
          return (
            <Box key={achievement.id} marginY={1} borderStyle="round" borderColor="green" paddingX={2} flexDirection="row">
              <Text>{achievement.emoji}  </Text>
              <Box flexDirection="column" flexGrow={1}>
                <Box flexDirection="row" justifyContent="space-between">
                  <Text color="yellow" bold>{achievement.name}</Text>
                  <Text color={rarityInfo.color}>[{rarityInfo.symbol} {rarityInfo.label}]</Text>
                </Box>
                <Text color="gray" dimColor>{achievement.description}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function ComparisonSlide({ comparisonStats }: { comparisonStats: ComparisonStats }) {
  const { year2024, year2025, growth } = comparisonStats;

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
        <Text color="white" dimColor>2024 vs 2025 - Your Growth Story</Text>
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
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box marginBottom={1}>
        <Text color="green" bold>READY TO SHARE?</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="white">
          {stats.totalCommits} commits • {stats.totalPRs} PRs • {stats.totalRepos} repos
        </Text>
      </Box>
      <Box marginBottom={2}>
        <Text color="green" dimColor>
          {stats.totalIssues} issues • {(stats.totalLinesChanged / 1000).toFixed(0)}K lines changed
        </Text>
      </Box>

      {/* Letter key shortcuts menu */}
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={3} paddingY={1} width={60}>
        <Box marginBottom={1}>
          <Text color="cyan" dimColor>Press a key:</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="green" bold>[P] </Text>
          <Text color="white">Export as PNG (Recommended)</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="cyan" bold>[S] </Text>
          <Text color="white">Export as SVG (Vector)</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="green" bold>[G] </Text>
          <Text color="white">Export as GIF (Experimental)</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="green" bold>[T] </Text>
          <Text color="white">Share on Twitter</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="green" bold>[L] </Text>
          <Text color="white">Share on LinkedIn</Text>
        </Box>

        <Box>
          <Text color="red" bold>[Q] </Text>
          <Text color="white">Exit</Text>
        </Box>
      </Box>
    </Box>
  );
}

// Main Slideshow Component
export function StatsDisplay({ stats, onExport, onExit, onShare, comparisonStats }: StatsDisplayProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

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

  // Build slides array conditionally
  const baseSlides = [
    <ContributionsSlide key="contrib" stats={stats} />,
    <LanguagesSlide key="langs" stats={stats} />,
    <ArchetypeSlide key="arch" stats={stats} />,
    <StreakSlide key="streak" stats={stats} />,
    <PRsAndIssuesSlide key="prs" stats={stats} />,
    <StarsSlide key="stars" stats={stats} />,
    <AchievementsSlide key="achieve" stats={stats} />,
  ];

  // Add comparison slide if data is available
  if (comparisonStats) {
    baseSlides.push(<ComparisonSlide key="comparison" comparisonStats={comparisonStats} />);
  }

  // Add export slide at the end
  baseSlides.push(<ExportSlide key="export" stats={stats} />);

  const slides = baseSlides;
  const totalSlides = slides.length;

  useInput((input, key) => {
    // If on export slide (last slide), handle letter key shortcuts
    if (currentSlide === totalSlides - 1) {
      if (input === 'p' || input === 'P') {
        onExport('png');
      } else if (input === 's' || input === 'S') {
        onExport('svg');
      } else if (input === 'g' || input === 'G') {
        onExport('gif');
      } else if (input === 't' || input === 'T') {
        if (onShare) onShare('twitter');
      } else if (input === 'l' || input === 'L') {
        if (onShare) onShare('linkedin');
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
    <Box flexDirection="column" width="100%" height="100%" justifyContent="center" alignItems="center">
      {/* Card Container with Border - 16:9 ratio, centered */}
      <Box flexDirection="column" borderStyle="double" borderColor="green" width={100} height={30}>
        {/* Header with ESC in top left, title centered */}
        <Box flexDirection="row" justifyContent="space-between" paddingY={1} paddingX={2} borderBottom borderColor="green">
          <Text color="red" dimColor>[ESC] Exit</Text>
          <Box flexGrow={1} justifyContent="center">
            <Text bold color="green">GITHUB WRAPPED 2025</Text>
          </Box>
          {currentSlide === totalSlides - 1 ? (
            <Text color="cyan" dimColor>Press P/S/G/T/L/Q</Text>
          ) : (
            <Box width={19}></Box>
          )}
        </Box>

        {/* Current Slide with Side Arrows - Fixed Height Container */}
        <Box flexDirection="row" height={24} alignItems="center">
          {/* Left Arrow */}
          <Box width={3} justifyContent="center" alignItems="center">
            {currentSlide > 0 && <Text color="cyan" bold>←</Text>}
          </Box>

          {/* Content */}
          <Box flexDirection="column" flexGrow={1} paddingY={1}>
            {slides[currentSlide]}
          </Box>

          {/* Right Arrow */}
          <Box width={3} justifyContent="center" alignItems="center">
            {currentSlide < totalSlides - 1 && <Text color="cyan" bold>→</Text>}
          </Box>
        </Box>

        {/* Navigation Footer - Just Progress Dots */}
        <Box flexDirection="column" borderTop borderColor="green">
          {/* Progress Dots */}
          <Box justifyContent="center" paddingY={1}>
            {Array.from({ length: totalSlides }).map((_, i) => (
              <Text key={i} color={i === currentSlide ? 'green' : 'gray'}>
                {i === currentSlide ? '■' : '□'}{' '}
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}
