import { Octokit } from '@octokit/rest';
import type { GitHubUser, Repository, Commit, ContributionDay } from './types.js';

export class GitHubClient {
  private octokit: Octokit;
  private username: string;

  constructor(username: string, token?: string) {
    this.username = username;
    this.octokit = new Octokit({
      auth: token,
      userAgent: 'gh-wrapped-cli',
    });
  }

  async getUser(): Promise<GitHubUser> {
    try {
      const { data } = await this.octokit.users.getByUsername({
        username: this.username,
      });
      return data as GitHubUser;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`GitHub user "${this.username}" not found. Please check the username and try again.`);
      }
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later or use a GitHub token.');
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  async getRepositories(): Promise<Repository[]> {
    try {
      const repos: Repository[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore && page <= 10) {
        const { data } = await this.octokit.repos.listForUser({
          username: this.username,
          per_page: 100,
          page,
          sort: 'updated',
        });

        if (data.length === 0) {
          hasMore = false;
        } else {
          repos.push(...(data as Repository[]));
          page++;
        }
      }

      if (repos.length === 0) {
        throw new Error('No public repositories found for this user.');
      }

      return repos;
    } catch (error: any) {
      if (error.message.includes('No public repositories')) {
        throw error;
      }
      if (error.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
  }

  async getCommitsForYear(year: number = 2025): Promise<Commit[]> {
    const repos = await this.getRepositories();
    const commits: Commit[] = [];

    const startDate = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);
    const today = new Date();

    // Check if year is in the future
    if (startDate > today) {
      throw new Error(`Year ${year} is in the future. Please use ${today.getFullYear()} or earlier.`);
    }

    // If we're still in the target year, use today as end date, otherwise use year end
    const endDate = year === today.getFullYear() ? today : yearEnd;

    // Get commits from up to 10 most recently updated repos
    const recentRepos = repos.slice(0, 10);

    for (const repo of recentRepos) {
      try {
        const { data } = await this.octokit.repos.listCommits({
          owner: this.username,
          repo: repo.name,
          author: this.username,
          since: startDate.toISOString(),
          until: endDate.toISOString(),
          per_page: 100,
        });

        commits.push(...(data as Commit[]));
      } catch (error) {
        // Skip repos we can't access (private, deleted, etc.)
        continue;
      }
    }

    if (commits.length === 0) {
      throw new Error(`No commits found for ${this.username} in ${year}. Try a different year or username.`);
    }

    return commits;
  }

  async getPullRequests(year: number = 2025): Promise<number> {
    const startDate = `${year}-01-01`;
    const today = new Date();
    const yearEnd = `${year}-12-31`;

    // If we're still in the target year, use today's date, otherwise use year end
    const endDate = year === today.getFullYear()
      ? today.toISOString().split('T')[0]
      : yearEnd;

    try {
      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: `author:${this.username} type:pr created:${startDate}..${endDate}`,
        per_page: 1,
      });

      return data.total_count;
    } catch (error) {
      return 0;
    }
  }

  async getIssues(year: number = 2025): Promise<number> {
    const startDate = `${year}-01-01`;
    const today = new Date();
    const yearEnd = `${year}-12-31`;

    // If we're still in the target year, use today's date, otherwise use year end
    const endDate = year === today.getFullYear()
      ? today.toISOString().split('T')[0]
      : yearEnd;

    try {
      const { data } = await this.octokit.search.issuesAndPullRequests({
        q: `author:${this.username} type:issue created:${startDate}..${endDate}`,
        per_page: 1,
      });

      return data.total_count;
    } catch (error) {
      return 0;
    }
  }

  async getLanguages(): Promise<{ [key: string]: number }> {
    const repos = await this.getRepositories();
    const languageStats: { [key: string]: number } = {};

    for (const repo of repos) {
      try {
        const { data } = await this.octokit.repos.listLanguages({
          owner: this.username,
          repo: repo.name,
        });

        for (const [language, bytes] of Object.entries(data)) {
          languageStats[language] = (languageStats[language] || 0) + bytes;
        }
      } catch (error) {
        continue;
      }
    }

    return languageStats;
  }

  // Simulated contribution calendar (GitHub API requires auth for this)
  async getContributionCalendar(year: number = 2025): Promise<ContributionDay[]> {
    const commits = await this.getCommitsForYear(year);
    const calendar: { [date: string]: number } = {};

    for (const commit of commits) {
      const date = commit.commit.author.date.split('T')[0];
      calendar[date] = (calendar[date] || 0) + 1;
    }

    const contributions: ContributionDay[] = [];
    const startDate = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year}-12-31`);
    const today = new Date();

    // If we're still in the target year, use today as end date, otherwise use year end
    const endDate = year === today.getFullYear() ? today : yearEnd;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      contributions.push({
        date: dateStr,
        count: calendar[dateStr] || 0,
      });
    }

    return contributions;
  }
}
