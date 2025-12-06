import { graphql } from '@octokit/graphql';
import type { GitHubUser, Repository, Commit, ContributionDay } from './types.js';

interface GraphQLResponse {
  user: {
    name: string;
    login: string;
    avatarUrl: string;
    bio: string;
    company: string;
    location: string;
    publicRepos: { totalCount: number };
    followers: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalIssueContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: Array<{
          contributionDays: Array<{
            contributionCount: number;
            date: string;
            weekday: number;
          }>;
        }>;
      };
      commitContributionsByRepository: Array<{
        repository: {
          name: string;
          owner: { login: string };
          stargazerCount: number;
          forkCount: number;
          languages: {
            edges: Array<{
              size: number;
              node: { name: string; color: string };
            }>;
          };
        };
        contributions: {
          nodes: Array<{
            occurredAt: string;
            commitCount: number;
          }>;
        };
      }>;
      pullRequestContributions: {
        nodes: Array<{
          pullRequest: {
            title: string;
            createdAt: string;
            additions: number;
            deletions: number;
            changedFiles: number;
            repository: { name: string };
          };
        }>;
      };
    };
    repositories: {
      totalCount: number;
      nodes: Array<{
        name: string;
        stargazerCount: number;
        forkCount: number;
        description: string;
        url: string;
        primaryLanguage: { name: string; color: string } | null;
      }>;
    };
  };
}

export class GitHubGraphQLClient {
  private graphqlWithAuth: typeof graphql;
  private username: string;
  // Cache for complete stats to avoid repeated queries
  private statsCache: Map<number, GraphQLResponse> = new Map();

  constructor(username: string, token?: string) {
    this.username = username;
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: token ? `token ${token}` : undefined,
      },
    });
  }

  private async getCompleteStats(year: number = 2025): Promise<GraphQLResponse> {
    // Return cached data if available
    if (this.statsCache.has(year)) {
      return this.statsCache.get(year)!;
    }

    const startDate = new Date(`${year}-01-01`);
    const today = new Date();
    const yearEnd = new Date(`${year}-12-31`);
    const endDate = year === today.getFullYear() ? today : yearEnd;

    // Check if year is in the future
    if (startDate > today) {
      throw new Error(`Year ${year} is in the future. Please use ${today.getFullYear()} or earlier.`);
    }

    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          name
          login
          avatarUrl
          bio
          company
          location
          publicRepos: repositories(privacy: PUBLIC) {
            totalCount
          }
          followers {
            totalCount
          }

          # REAL contribution data - not simulated!
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions

            # This is GitHub's ACTUAL contribution calendar
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                }
              }
            }

            # Real commit data with repository details
            commitContributionsByRepository(maxRepositories: 100) {
              repository {
                name
                owner { login }
                stargazerCount
                forkCount
                languages(first: 10) {
                  edges {
                    size
                    node {
                      name
                      color
                    }
                  }
                }
              }
              contributions(first: 100) {
                nodes {
                  occurredAt
                  commitCount
                }
              }
            }

            # Pull requests with REAL additions/deletions
            pullRequestContributions(first: 100) {
              nodes {
                pullRequest {
                  title
                  createdAt
                  additions
                  deletions
                  changedFiles
                  repository {
                    name
                  }
                }
              }
            }
          }

          # All repositories
          repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}, privacy: PUBLIC) {
            totalCount
            nodes {
              name
              stargazerCount
              forkCount
              description
              url
              primaryLanguage {
                name
                color
              }
            }
          }
        }
      }
    `;

    try {
      const result = await this.graphqlWithAuth<GraphQLResponse>(query, {
        username: this.username,
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      });

      // Validate response structure
      if (!result || !result.user) {
        throw new Error(`GitHub user "${this.username}" not found or data is unavailable.`);
      }

      if (!result.user.contributionsCollection) {
        throw new Error(`Contributions data not available. A GitHub token is required for contribution data.`);
      }

      // Cache the result
      this.statsCache.set(year, result);

      return result;
    } catch (error: any) {
      // Clear cache on error
      this.statsCache.delete(year);

      if (error.message?.includes('NOT_FOUND') || error.message?.includes('Could not resolve to a User')) {
        throw new Error(`GitHub user "${this.username}" not found. Please check the username and try again.`);
      }
      if (error.status === 403 || error.message?.includes('rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please try again later or use a GitHub token.');
      }
      if (error.message?.includes('token') || error.message?.includes('contributions data')) {
        throw error; // Re-throw our custom errors
      }
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  async getUser(): Promise<GitHubUser> {
    const data = await this.getCompleteStats();
    return {
      login: data.user.login,
      name: data.user.name,
      avatar_url: data.user.avatarUrl,
      bio: data.user.bio,
      company: data.user.company,
      location: data.user.location,
      public_repos: data.user.publicRepos.totalCount,
      followers: data.user.followers.totalCount,
    } as GitHubUser;
  }

  async getRepositories(): Promise<Repository[]> {
    const data = await this.getCompleteStats();

    // Convert GraphQL repos to REST format for compatibility
    return data.user.repositories.nodes.map((repo) => ({
      name: repo.name,
      stargazers_count: repo.stargazerCount,
      forks_count: repo.forkCount,
      description: repo.description,
      html_url: repo.url,
      language: repo.primaryLanguage?.name || 'Unknown',
      size: 0, // Not needed anymore with real data
    })) as Repository[];
  }

  async getCommitsForYear(year: number = 2025): Promise<Commit[]> {
    const data = await this.getCompleteStats(year);
    const commits: Commit[] = [];

    const repoContribs = data.user.contributionsCollection.commitContributionsByRepository || [];

    // Convert GraphQL commit contributions to Commit objects
    for (const repoContrib of repoContribs) {
      if (!repoContrib?.repository || !repoContrib?.contributions?.nodes) continue;

      for (const contrib of repoContrib.contributions.nodes) {
        if (!contrib?.occurredAt) continue;

        commits.push({
          commit: {
            author: {
              date: contrib.occurredAt,
              name: this.username,
            },
            message: '', // Not available in this query
          },
          repository: repoContrib.repository.name,
        } as Commit);
      }
    }

    if (commits.length === 0) {
      throw new Error(`No commits found for ${this.username} in ${year}. Try a different year or username.`);
    }

    return commits;
  }

  async getPullRequests(year: number = 2025): Promise<number> {
    const data = await this.getCompleteStats(year);
    return data.user.contributionsCollection?.totalPullRequestContributions || 0;
  }

  async getIssues(year: number = 2025): Promise<number> {
    const data = await this.getCompleteStats(year);
    return data.user.contributionsCollection?.totalIssueContributions || 0;
  }

  async getLanguages(): Promise<{ [key: string]: number }> {
    const data = await this.getCompleteStats();
    const languageStats: { [key: string]: number } = {};

    const repoContribs = data.user.contributionsCollection.commitContributionsByRepository || [];

    // Aggregate language bytes from all repositories
    for (const repoContrib of repoContribs) {
      if (!repoContrib?.repository?.languages?.edges) continue;

      const languages = repoContrib.repository.languages.edges;
      for (const lang of languages) {
        if (!lang?.node?.name || !lang?.size) continue;
        languageStats[lang.node.name] = (languageStats[lang.node.name] || 0) + lang.size;
      }
    }

    return languageStats;
  }

  // REAL contribution calendar from GitHub (not simulated!)
  async getContributionCalendar(year: number = 2025): Promise<ContributionDay[]> {
    const data = await this.getCompleteStats(year);
    const calendar = data.user.contributionsCollection?.contributionCalendar;

    const contributions: ContributionDay[] = [];

    if (!calendar?.weeks) {
      return contributions; // Return empty array if no calendar data
    }

    // Flatten weeks into individual contribution days
    for (const week of calendar.weeks) {
      if (!week?.contributionDays) continue;

      for (const day of week.contributionDays) {
        if (!day?.date) continue;

        contributions.push({
          date: day.date,
          count: day.contributionCount || 0,
        });
      }
    }

    return contributions;
  }

  // NEW: Get REAL lines changed data
  async getTotalLinesChanged(year: number = 2025): Promise<{ additions: number; deletions: number; total: number }> {
    const data = await this.getCompleteStats(year);
    const prs = data.user.contributionsCollection.pullRequestContributions?.nodes || [];

    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const pr of prs) {
      // Null check: pullRequest can be null if PR was deleted
      if (pr?.pullRequest) {
        totalAdditions += pr.pullRequest.additions || 0;
        totalDeletions += pr.pullRequest.deletions || 0;
      }
    }

    return {
      additions: totalAdditions,
      deletions: totalDeletions,
      total: totalAdditions + totalDeletions,
    };
  }

  // NEW: Get code review activity
  async getCodeReviewCount(year: number = 2025): Promise<number> {
    const data = await this.getCompleteStats(year);
    return data.user.contributionsCollection?.totalPullRequestReviewContributions || 0;
  }
}
