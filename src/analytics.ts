import type {
  WrappedStats,
  Language,
  ContributionDay,
  Commit,
  Repository,
  Archetype,
  Achievement,
  GitHubUser,
  ComparisonStats,
  YearComparison,
} from './types.js';

export class StatsAnalyzer {
  calculateStreak(contributions: ContributionDay[]): {
    longest: number;
    current: number;
  } {
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;

    // Sort by date
    const sorted = [...contributions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].count > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate current streak from end
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      longest: longestStreak,
      current: currentStreak,
    };
  }

  calculateTopLanguages(languageStats: { [key: string]: number }): Language[] {
    const total = Object.values(languageStats).reduce((a, b) => a + b, 0);

    const languages: Language[] = Object.entries(languageStats)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: (bytes / total) * 100,
        color: this.getLanguageColor(name),
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 5);

    return languages;
  }

  getLanguageColor(language: string): string {
    const colors: { [key: string]: string } = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      Java: '#b07219',
      C: '#555555',
      'C++': '#f34b7d',
      'C#': '#178600',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Go: '#00ADD8',
      Rust: '#dea584',
      Swift: '#ffac45',
      Kotlin: '#A97BFF',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Shell: '#89e051',
    };

    return colors[language] || '#858585';
  }

  calculatePeakHour(commits: Commit[]): number {
    const hourCounts = new Array(24).fill(0);

    for (const commit of commits) {
      const hour = new Date(commit.commit.author.date).getHours();
      hourCounts[hour]++;
    }

    const maxCount = Math.max(...hourCounts);
    return hourCounts.indexOf(maxCount);
  }

  determineArchetype(
    peakHour: number,
    totalCommits: number,
    totalPRs: number,
    contributions: ContributionDay[]
  ): Archetype {
    // Night Owl (2 AM - 5 AM)
    if (peakHour >= 2 && peakHour <= 5) {
      return {
        name: 'The Midnight Warrior',
        emoji: '🌙',
        description:
          "You're a nocturnal coding machine who thrives in the quiet hours. Your best work happens after everyone else sleeps.",
        traits: ['Most active: 2-4 AM', 'Prefers solo deep work', 'Peak creativity after dark'],
      };
    }

    // Early Bird (5 AM - 9 AM)
    if (peakHour >= 5 && peakHour <= 9) {
      return {
        name: 'The Early Bird',
        emoji: '🌅',
        description:
          'You start coding before the world wakes up. Your morning productivity is legendary.',
        traits: ['Most active: 5-9 AM', 'Morning person', 'Focused before distractions'],
      };
    }

    // Weekend Warrior
    const weekendCommits = contributions.filter((c) => {
      const day = new Date(c.date).getDay();
      return (day === 0 || day === 6) && c.count > 0;
    }).length;

    if (weekendCommits > contributions.length * 0.4) {
      return {
        name: 'The Weekend Warrior',
        emoji: '⚔️',
        description: 'Weekends are for side projects and open source. You code for passion, not just work.',
        traits: ['Active on weekends', 'Side project enthusiast', 'Passionate coder'],
      };
    }

    // Pull Request Hero
    if (totalPRs > 50) {
      return {
        name: 'The Merge Master',
        emoji: '🔀',
        description:
          'You live for collaboration and code reviews. Your PRs are always well-documented and mergeable.',
        traits: ['High PR activity', 'Team player', 'Code review champion'],
      };
    }

    // Consistent Coder (default)
    return {
      name: 'The Consistent Coder',
      emoji: '💻',
      description: 'Steady, reliable, and consistent. You show up every day and get things done.',
      traits: ['Regular contributions', 'Reliable workflow', 'Balanced approach'],
    };
  }

  calculateAchievements(stats: Partial<WrappedStats>): Achievement[] {
    const achievements: Achievement[] = [];

    // Define all achievements
    const allAchievements: Achievement[] = [
      // MYTHIC tier - Ultra rare, exceptional achievements
      {
        id: 'legend',
        name: 'Living Legend',
        description: '365-day streak - committed every single day',
        emoji: '👑',
        rarity: 'mythic',
        unlocked: (stats.longestStreak || 0) >= 365,
      },
      {
        id: 'ultra-prolific',
        name: 'Ultra Prolific',
        description: '5000+ commits this year',
        emoji: '⚡',
        rarity: 'mythic',
        unlocked: (stats.totalCommits || 0) >= 5000,
      },
      {
        id: 'viral-sensation',
        name: 'Viral Sensation',
        description: '10000+ stars earned',
        emoji: '💫',
        rarity: 'mythic',
        unlocked: (stats.totalStars || 0) >= 10000,
      },

      // LEGENDARY tier - Very rare achievements
      {
        id: 'century-club',
        name: 'Century Club',
        description: '100+ day contribution streak',
        emoji: '🌟',
        rarity: 'legendary',
        unlocked: (stats.longestStreak || 0) >= 100,
      },
      {
        id: 'commit-machine',
        name: 'Commit Machine',
        description: '1000+ commits this year',
        emoji: '💪',
        rarity: 'legendary',
        unlocked: (stats.totalCommits || 0) >= 1000,
      },
      {
        id: 'super-star',
        name: 'GitHub Super Star',
        description: '1000+ stars earned',
        emoji: '🌠',
        rarity: 'legendary',
        unlocked: (stats.totalStars || 0) >= 1000,
      },

      // EPIC tier - Hard to achieve
      {
        id: 'half-year-streak',
        name: 'Half Year Hero',
        description: '180+ day contribution streak',
        emoji: '🔥',
        rarity: 'epic',
        unlocked: (stats.longestStreak || 0) >= 180,
      },
      {
        id: 'pr-champion',
        name: 'PR Champion',
        description: '200+ PRs created',
        emoji: '🏆',
        rarity: 'epic',
        unlocked: (stats.totalPRs || 0) >= 200,
      },
      {
        id: 'mega-productive',
        name: 'Mega Productive',
        description: '2500+ commits this year',
        emoji: '🚀',
        rarity: 'epic',
        unlocked: (stats.totalCommits || 0) >= 2500,
      },
      {
        id: 'celebrity',
        name: 'Open Source Celebrity',
        description: '500+ stars earned',
        emoji: '✨',
        rarity: 'epic',
        unlocked: (stats.totalStars || 0) >= 500,
      },

      // RARE tier - Uncommon achievements
      {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Peak coding hours after midnight',
        emoji: '🦉',
        rarity: 'rare',
        unlocked: (stats.peakHour || 0) >= 0 && (stats.peakHour || 0) <= 5,
      },
      {
        id: 'pr-hero',
        name: 'Pull Request Hero',
        description: '100+ PRs created',
        emoji: '🔀',
        rarity: 'rare',
        unlocked: (stats.totalPRs || 0) >= 100,
      },
      {
        id: 'polyglot',
        name: 'Polyglot',
        description: 'Used 5+ programming languages',
        emoji: '🗣️',
        rarity: 'rare',
        unlocked: (stats.topLanguages || []).length >= 5,
      },
      {
        id: 'popular',
        name: 'Rising Star',
        description: '100+ stars earned',
        emoji: '⭐',
        rarity: 'rare',
        unlocked: (stats.totalStars || 0) >= 100,
      },
      {
        id: 'prolific',
        name: 'Prolific Coder',
        description: '500+ commits this year',
        emoji: '💻',
        rarity: 'rare',
        unlocked: (stats.totalCommits || 0) >= 500,
      },

      // COMMON tier - Most achievable
      {
        id: 'getting-started',
        name: 'Getting Started',
        description: 'Made your first commit of the year',
        emoji: '👨‍💻',
        rarity: 'common',
        unlocked: (stats.totalCommits || 0) > 0,
      },
      {
        id: 'consistent',
        name: 'Consistent Contributor',
        description: '30+ day streak',
        emoji: '📅',
        rarity: 'common',
        unlocked: (stats.longestStreak || 0) >= 30,
      },
      {
        id: 'active',
        name: 'Active Developer',
        description: '100+ commits this year',
        emoji: '🔨',
        rarity: 'common',
        unlocked: (stats.totalCommits || 0) >= 100,
      },
      {
        id: 'collaborator',
        name: 'Team Collaborator',
        description: '20+ PRs created',
        emoji: '🤝',
        rarity: 'common',
        unlocked: (stats.totalPRs || 0) >= 20,
      },
      {
        id: 'noticed',
        name: 'Getting Noticed',
        description: '10+ stars earned',
        emoji: '🌟',
        rarity: 'common',
        unlocked: (stats.totalStars || 0) >= 10,
      },
    ];

    // Return only unlocked achievements
    return allAchievements.filter((a) => a.unlocked);
  }

  calculateBusiestDay(contributions: ContributionDay[]): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);

    for (const day of contributions) {
      if (day.count > 0) {
        const dayOfWeek = new Date(day.date).getDay();
        dayCounts[dayOfWeek] += day.count;
      }
    }

    const maxCount = Math.max(...dayCounts);
    return dayNames[dayCounts.indexOf(maxCount)];
  }

  /**
   * Find the repository with the most commits
   * @param commits - Array of commits (should include repository field from GraphQL)
   * @param repos - Array of repositories (fallback if no commits found)
   * @returns Name of the most active repository
   */
  findMostActiveRepo(commits: Commit[], repos: Repository[]): string {
    if (repos.length === 0) return 'N/A';
    if (commits.length === 0) return repos[0]?.name || 'N/A';

    // Count commits per repository
    const repoCommitCounts = new Map<string, number>();

    for (const commit of commits) {
      const repoName = commit.repository || 'unknown';
      repoCommitCounts.set(repoName, (repoCommitCounts.get(repoName) || 0) + 1);
    }

    // Find repository with the highest commit count
    let maxCommits = 0;
    let mostActive = repos[0].name;

    for (const [repo, count] of repoCommitCounts.entries()) {
      if (count > maxCommits) {
        maxCommits = count;
        mostActive = repo;
      }
    }

    return mostActive;
  }

  calculateTotalLinesChanged(repos: Repository[], realLinesChanged?: { additions: number; deletions: number; total: number }): number {
    // Use REAL data from GraphQL if available, otherwise fallback to estimate
    if (realLinesChanged) {
      return realLinesChanged.total;
    }
    // Fallback: Estimate based on repo sizes (rough approximation)
    return repos.reduce((sum, repo) => sum + repo.size, 0);
  }

  generateSmartInsights(stats: Partial<WrappedStats>): string[] {
    const insights: string[] = [];

    // Peak hour insights
    if (stats.peakHour !== undefined) {
      if (stats.peakHour >= 0 && stats.peakHour <= 5) {
        insights.push(`🌙 Night owl - ${Math.round(((stats.peakHour <= 5 ? 100 : 0)))}% of commits after midnight`);
      } else if (stats.peakHour >= 9 && stats.peakHour <= 17) {
        insights.push('☀️ 9-to-5 grinder - peak productivity during work hours');
      } else if (stats.peakHour >= 18 && stats.peakHour <= 23) {
        insights.push('🌆 Evening coder - most active after dinner');
      }
    }

    // Language insights
    if (stats.topLanguages && stats.topLanguages.length > 0) {
      const topLang = stats.topLanguages[0];
      if (topLang.percentage > 60) {
        insights.push(`💎 ${topLang.name} specialist - ${topLang.percentage.toFixed(0)}% of your code`);
      } else if (stats.topLanguages.length >= 5) {
        insights.push(`🗣️ True polyglot - mastered ${stats.topLanguages.length} languages`);
      }
    }

    // Commit frequency
    if (stats.totalCommits && stats.avgCommitsPerDay) {
      if (stats.avgCommitsPerDay >= 5) {
        insights.push(`🔥 Commit machine - averaging ${stats.avgCommitsPerDay.toFixed(1)} commits/day`);
      } else if (stats.avgCommitsPerDay >= 1) {
        insights.push(`✨ Consistent contributor - ${stats.avgCommitsPerDay.toFixed(1)} commits/day`);
      }
    }

    // Streak insights
    if (stats.longestStreak && stats.longestStreak >= 7) {
      insights.push(`⚡ ${stats.longestStreak}-day streak - dedication level: legendary`);
    }

    // PR insights
    if (stats.totalPRs && stats.totalPRs >= 20) {
      insights.push(`🤝 Collaboration king - ${stats.totalPRs} PRs merged`);
    }

    // Stars insights
    if (stats.totalStars && stats.totalStars >= 50) {
      insights.push(`⭐ Community favorite - ${stats.totalStars} stars earned`);
    }

    return insights.slice(0, 3); // Return top 3 insights
  }

  async generateWrappedStats(
    user: GitHubUser,
    commits: Commit[],
    repos: Repository[],
    languageStats: { [key: string]: number },
    contributions: ContributionDay[],
    totalPRs: number,
    totalIssues: number,
    realLinesChanged?: { additions: number; deletions: number; total: number },
    year?: number,
    dateRange?: string,
    accurateCommitCount?: number
  ): Promise<WrappedStats> {
    const streaks = this.calculateStreak(contributions);
    const topLanguages = this.calculateTopLanguages(languageStats);
    const peakHour = this.calculatePeakHour(commits);
    const busiestDay = this.calculateBusiestDay(contributions);
    const mostActiveRepo = this.findMostActiveRepo(commits, repos);
    const totalLinesChanged = this.calculateTotalLinesChanged(repos, realLinesChanged);

    // Use accurate commit count from GitHub API, fallback to commits array length
    const totalCommits = accurateCommitCount || commits.length;

    // Calculate days in the selected year
    const selectedYear = year || new Date().getFullYear();
    const startOfYear = new Date(`${selectedYear}-01-01`);
    const endOfYear = selectedYear === new Date().getFullYear() ? new Date() : new Date(`${selectedYear}-12-31`);
    const daysInYear = Math.ceil((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const avgCommitsPerDay = totalCommits / Math.max(daysInYear, 1);

    const stats: Partial<WrappedStats> = {
      user,
      totalCommits,
      totalPRs,
      totalIssues,
      totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
      totalRepos: user.public_repos,
      longestStreak: streaks.longest,
      currentStreak: streaks.current,
      topLanguages,
      topRepos: repos
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5),
      contributions,
      peakHour,
      busiestDay,
      mostActiveRepo,
      totalLinesChanged,
      avgCommitsPerDay,
      year: selectedYear,
      dateRange: dateRange || `${startOfYear.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfYear.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };

    const archetype = this.determineArchetype(
      peakHour,
      stats.totalCommits!,
      totalPRs,
      contributions
    );

    const achievements = this.calculateAchievements(stats);
    const insights = this.generateSmartInsights(stats);

    return {
      ...stats,
      archetype,
      achievements,
      insights,
    } as WrappedStats;
  }

  generateYearComparison(
    year: number,
    commits: Commit[],
    languageStats: { [key: string]: number },
    contributions: ContributionDay[],
    totalPRs: number,
    totalIssues: number,
    accurateCommitCount?: number
  ): YearComparison {
    const streaks = this.calculateStreak(contributions);
    const topLanguages = this.calculateTopLanguages(languageStats);
    const peakHour = this.calculatePeakHour(commits);

    return {
      year,
      totalCommits: accurateCommitCount || commits.length,
      totalPRs,
      totalIssues,
      longestStreak: streaks.longest,
      topLanguages,
      peakHour,
    };
  }

  generateComparisonStats(
    year2024Data: YearComparison,
    year2025Data: YearComparison
  ): ComparisonStats {
    const calculateGrowth = (old: number, current: number): number => {
      if (old === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - old) / old) * 100);
    };

    return {
      year2024: year2024Data,
      year2025: year2025Data,
      growth: {
        commits: calculateGrowth(year2024Data.totalCommits, year2025Data.totalCommits),
        prs: calculateGrowth(year2024Data.totalPRs, year2025Data.totalPRs),
        issues: calculateGrowth(year2024Data.totalIssues, year2025Data.totalIssues),
        streak: calculateGrowth(year2024Data.longestStreak, year2025Data.longestStreak),
      },
    };
  }
}
