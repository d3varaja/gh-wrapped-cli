import { graphql } from '@octokit/graphql';
import type { GitHubUser, Repository, Commit, ContributionDay } from './types.js';

interface GraphQLResponse {
  viewer?: {
    login: string;
    name: string;
    avatarUrl: string;
    bio: string;
    company: string;
    location: string;
    createdAt: string;
    repositories: { totalCount: number };
    followers: { totalCount: number };
    following: { totalCount: number };
    contributionsCollection: ContributionsCollectionData;
    repositories_data: RepositoriesData;
  };
  user?: {
    login: string;
    name: string;
    avatarUrl: string;
    bio: string;
    company: string;
    location: string;
    createdAt: string;
    repositories: { totalCount: number };
    followers: { totalCount: number };
    following: { totalCount: number };
    contributionsCollection: ContributionsCollectionData;
    repositories_data: RepositoriesData;
  };
}

interface ContributionsCollectionData {
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
        color: string;
      }>;
    }>;
  };
  commitContributionsByRepository: Array<{
    repository: {
      name: string;
      nameWithOwner: string;
      stargazerCount: number;
      forkCount: number;
      primaryLanguage: { name: string; color: string } | null;
    };
    contributions: {
      totalCount: number;
      nodes: Array<{
        occurredAt: string;
      }>;
    };
  }>;
  pullRequestContributions: {
    totalCount: number;
    nodes: Array<{
      pullRequest: {
        title: string;
        createdAt: string;
        additions: number;
        deletions: number;
        changedFiles: number;
        repository: { name: string };
      } | null;
    }>;
  };
}

interface RepositoriesData {
  totalCount: number;
  nodes: Array<{
    name: string;
    stargazerCount: number;
    forkCount: number;
    description: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    primaryLanguage: { name: string; color: string } | null;
  }>;
}

export class GitHubGraphQLClient {
  private graphqlWithAuth: typeof graphql;
  private username: string;
  private statsCache: Map<number, GraphQLResponse> = new Map();

  constructor(username: string, token?: string) {
    this.username = username;
    this.graphqlWithAuth = graphql.defaults({
      headers: {
        authorization: token ? `bearer ${token}` : undefined,
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

    // Always use user(login:) query - token just provides higher rate limits
    // and access to private contributions for the queried user
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          login
          name
          avatarUrl
          bio
          company
          location
          createdAt
          repositories(privacy: PUBLIC) {
            totalCount
          }
          followers {
            totalCount
          }
          following {
            totalCount
          }

          # ContributionsCollection - requires authentication
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions

            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                  color
                }
              }
            }

            commitContributionsByRepository(maxRepositories: 100) {
              repository {
                name
                nameWithOwner
                stargazerCount
                forkCount
                primaryLanguage {
                  name
                  color
                }
              }
              contributions(first: 100) {
                totalCount
                nodes {
                  occurredAt
                }
              }
            }

            pullRequestContributions(first: 100) {
              totalCount
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

          repositories_data: repositories(first: 100, orderBy: {field: STARGAZERS, direction: DESC}, privacy: PUBLIC) {
            totalCount
            nodes {
              name
              stargazerCount
              forkCount
              description
              url
              createdAt
              updatedAt
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
      const variables = {
        username: this.username,
        from: startDate.toISOString(),
        to: endDate.toISOString()
      };

      const result = await this.graphqlWithAuth<GraphQLResponse>(query, variables);

      // Get user data from the user query
      const userData = result.user;

      // Validate response structure
      if (!userData) {
        throw new Error(`Failed to fetch user data. Please check the username or token.`);
      }

      if (!userData.contributionsCollection) {
        throw new Error(`⚠️  AUTHENTICATION REQUIRED

GitHub's API requires authentication to access contribution data.

What you need:
1. Create a Personal Access Token at: https://github.com/settings/tokens
2. Minimum scope: read:user (for contribution data)
3. Run this app again and provide the token when prompted

Why this is needed:
- Without a token: Only public repository data is visible
- With a token: Full contribution calendar and statistics

Get your token now: https://github.com/settings/tokens/new?description=GitHub%20Wrapped&scopes=read:user`);
      }

      // Normalize the response
      const normalizedResult: GraphQLResponse = { user: userData as any };

      // Cache the result
      this.statsCache.set(year, normalizedResult);

      return normalizedResult;
    } catch (error: any) {
      // Clear cache on error
      this.statsCache.delete(year);

      // Handle specific errors
      if (error.message?.includes('AUTHENTICATION REQUIRED')) {
        throw error;
      }

      if (error.message?.includes('NOT_FOUND') || error.message?.includes('Could not resolve to a User')) {
        throw new Error(`GitHub user "${this.username}" not found. Please check the username and try again.`);
      }

      if (error.status === 401 || error.message?.includes('Bad credentials')) {
        throw new Error(`Invalid GitHub token. Please check your token and try again.

Get a new token at: https://github.com/settings/tokens
Required scope: read:user`);
      }

      if (error.status === 403 || error.message?.includes('rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please use a GitHub token for higher limits.');
      }

      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  private getUserData(response: GraphQLResponse) {
    return response.user!;
  }

  async getUser(): Promise<GitHubUser> {
    const data = await this.getCompleteStats();
    const user = this.getUserData(data);

    return {
      login: user.login,
      name: user.name,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      company: user.company,
      location: user.location,
      public_repos: user.repositories.totalCount,
      followers: user.followers.totalCount,
      following: user.following.totalCount,
      created_at: user.createdAt,
    } as GitHubUser;
  }

  async getRepositories(): Promise<Repository[]> {
    const data = await this.getCompleteStats();
    const user = this.getUserData(data);

    return user.repositories_data.nodes.map((repo) => ({
      name: repo.name,
      full_name: `${user.login}/${repo.name}`,
      stargazers_count: repo.stargazerCount,
      forks_count: repo.forkCount,
      description: repo.description,
      html_url: repo.url,
      language: repo.primaryLanguage?.name || 'Unknown',
      created_at: repo.createdAt,
      updated_at: repo.updatedAt,
      size: 0,
    })) as Repository[];
  }

  async getCommitsForYear(year: number = 2025): Promise<Commit[]> {
    const data = await this.getCompleteStats(year);
    const user = this.getUserData(data);
    const commits: Commit[] = [];

    const repoContribs = user.contributionsCollection.commitContributionsByRepository || [];

    for (const repoContrib of repoContribs) {
      if (!repoContrib?.repository || !repoContrib?.contributions?.nodes) continue;

      for (const contrib of repoContrib.contributions.nodes) {
        if (!contrib?.occurredAt) continue;

        commits.push({
          sha: '',
          commit: {
            author: {
              date: contrib.occurredAt,
              name: user.login,
              email: '',
            },
            message: '',
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
    const user = this.getUserData(data);
    return user.contributionsCollection?.totalPullRequestContributions || 0;
  }

  async getIssues(year: number = 2025): Promise<number> {
    const data = await this.getCompleteStats(year);
    const user = this.getUserData(data);
    return user.contributionsCollection?.totalIssueContributions || 0;
  }

  async getLanguages(): Promise<{ [key: string]: number }> {
    const data = await this.getCompleteStats();
    const user = this.getUserData(data);
    const languageStats: { [key: string]: number } = {};

    const repoContribs = user.contributionsCollection.commitContributionsByRepository || [];

    for (const repoContrib of repoContribs) {
      if (!repoContrib?.repository?.primaryLanguage) continue;

      const lang = repoContrib.repository.primaryLanguage.name;
      const count = repoContrib.contributions.totalCount;

      languageStats[lang] = (languageStats[lang] || 0) + count;
    }

    return languageStats;
  }

  async getContributionCalendar(year: number = 2025): Promise<ContributionDay[]> {
    const data = await this.getCompleteStats(year);
    const user = this.getUserData(data);
    const calendar = user.contributionsCollection?.contributionCalendar;

    const contributions: ContributionDay[] = [];

    if (!calendar?.weeks) {
      return contributions;
    }

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

  async getTotalLinesChanged(year: number = 2025): Promise<{ additions: number; deletions: number; total: number }> {
    const data = await this.getCompleteStats(year);
    const user = this.getUserData(data);
    const prs = user.contributionsCollection.pullRequestContributions?.nodes || [];

    let totalAdditions = 0;
    let totalDeletions = 0;

    for (const pr of prs) {
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

  async getCodeReviewCount(year: number = 2025): Promise<number> {
    const data = await this.getCompleteStats(year);
    const user = this.getUserData(data);
    return user.contributionsCollection?.totalPullRequestReviewContributions || 0;
  }

  async getTotalCommitCount(year: number = 2025): Promise<number> {
    const data = await this.getCompleteStats(year);
    const user = this.getUserData(data);
    return user.contributionsCollection?.totalCommitContributions || 0;
  }
}
