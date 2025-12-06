// Type definitions for GitHub Wrapped

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
}

export interface Repository {
  name: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  size: number;
}

export interface Language {
  name: string;
  bytes: number;
  percentage: number;
  color?: string;
}

export interface ContributionDay {
  date: string;
  count: number;
}

export interface WrappedStats {
  user: GitHubUser;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  totalStars: number;
  totalRepos: number;
  longestStreak: number;
  currentStreak: number;
  topLanguages: Language[];
  topRepos: Repository[];
  contributions: ContributionDay[];
  peakHour: number;
  busiestDay: string;
  mostActiveRepo: string;
  totalLinesChanged: number;
  archetype: Archetype;
  achievements: Achievement[];
  insights: string[];
  avgCommitsPerDay: number;
}

export interface Archetype {
  name: string;
  emoji: string;
  description: string;
  traits: string[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  unlocked: boolean;
}

export interface ExportOptions {
  format: 'twitter' | 'instagram' | 'story' | 'linkedin';
  template?: string;
}

export interface YearComparison {
  year: number;
  totalCommits: number;
  totalPRs: number;
  totalIssues: number;
  longestStreak: number;
  topLanguages: Language[];
  peakHour: number;
}

export interface ComparisonStats {
  year2024: YearComparison;
  year2025: YearComparison;
  growth: {
    commits: number; // percentage
    prs: number;
    issues: number;
    streak: number;
  };
}
