// SIMPLE EXPORT - SVG ONLY, NO SUBPROCESS, NO ISSUES
import satori from 'satori';
import type { WrappedStats } from './types.js';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SimpleExporter {
  private stats: WrappedStats;
  private static fontData: ArrayBuffer | null = null;

  constructor(stats: WrappedStats) {
    this.stats = stats;
  }

  private static loadFont(): ArrayBuffer {
    if (!this.fontData) {
      const fontPath = join(__dirname, 'fonts', 'PressStart2P-Regular.ttf');
      const fontBuffer = readFileSync(fontPath);
      this.fontData = fontBuffer.buffer.slice(
        fontBuffer.byteOffset,
        fontBuffer.byteOffset + fontBuffer.byteLength
      );
    }
    return this.fontData;
  }

  private generateJSX(): any {
    const user = this.stats.user || { login: 'unknown' };
    const totalCommits = this.stats.totalCommits || 0;
    const totalRepos = this.stats.totalRepos || 0;
    const totalPRs = this.stats.totalPRs || 0;
    const topLanguages = this.stats.topLanguages || [];
    const archetype = this.stats.archetype || { name: 'Developer', emoji: '💻' };

    return {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '750px',
          height: '1050px',
          background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)',
          padding: '60px 40px',
          fontFamily: 'Press Start 2P',
          color: '#fff',
          alignItems: 'center',
          justifyContent: 'center',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                fontSize: '20px',
                color: '#4facfe',
                marginBottom: '20px',
                textAlign: 'center',
                letterSpacing: '2px',
              },
              children: 'GITHUB WRAPPED',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '32px',
                color: '#f093fb',
                marginBottom: '50px',
                textAlign: 'center',
              },
              children: '2025',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '24px',
                color: '#fff',
                marginBottom: '60px',
                textAlign: 'center',
              },
              children: `@${user.login}`,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '100%',
                maxWidth: '600px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px 30px',
                      background: 'rgba(79, 172, 254, 0.1)',
                      borderRadius: '12px',
                      border: '2px solid #4facfe',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '14px', color: '#aaa' },
                          children: 'COMMITS',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '20px', color: '#4facfe', fontWeight: 'bold' },
                          children: totalCommits.toString(),
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px 30px',
                      background: 'rgba(240, 147, 251, 0.1)',
                      borderRadius: '12px',
                      border: '2px solid #f093fb',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '14px', color: '#aaa' },
                          children: 'PULL REQUESTS',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '20px', color: '#f093fb', fontWeight: 'bold' },
                          children: totalPRs.toString(),
                        },
                      },
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px 30px',
                      background: 'rgba(118, 75, 162, 0.1)',
                      borderRadius: '12px',
                      border: '2px solid #764ba2',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '14px', color: '#aaa' },
                          children: 'REPOSITORIES',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '20px', color: '#764ba2', fontWeight: 'bold' },
                          children: totalRepos.toString(),
                        },
                      },
                    ],
                  },
                },
                topLanguages.length > 0 ? {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px 30px',
                      background: 'rgba(255, 215, 0, 0.1)',
                      borderRadius: '12px',
                      border: '2px solid #FFD700',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '14px', color: '#aaa' },
                          children: 'TOP LANGUAGE',
                        },
                      },
                      {
                        type: 'div',
                        props: {
                          style: { fontSize: '16px', color: '#FFD700' },
                          children: topLanguages[0].name,
                        },
                      },
                    ],
                  },
                } : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: '18px',
                color: '#f093fb',
                marginTop: '60px',
                textAlign: 'center',
                padding: '20px 40px',
                background: 'rgba(240, 147, 251, 0.1)',
                borderRadius: '12px',
                border: '2px solid #f093fb',
              },
              children: `${archetype.emoji} ${archetype.name.toUpperCase()}`,
            },
          },
        ],
      },
    };
  }

  async exportSVG(filename: string = 'gh-wrapped.svg'): Promise<string> {
    const outputPath = join(process.cwd(), filename);

    const jsx = this.generateJSX();
    const fontData = SimpleExporter.loadFont();

    const svg = await satori(jsx, {
      width: 750,
      height: 1050,
      fonts: [{
        name: 'Press Start 2P',
        data: fontData,
        weight: 400,
        style: 'normal',
      }],
    });

    writeFileSync(outputPath, svg);
    return outputPath;
  }

  async saveJSON(filename: string = 'gh-wrapped.json'): Promise<string> {
    const outputPath = join(process.cwd(), filename);
    writeFileSync(outputPath, JSON.stringify(this.stats, null, 2));
    return outputPath;
  }

  generateShareText(): string {
    const { user, totalCommits, totalStars, longestStreak, archetype, achievements, topLanguages } = this.stats;
    const topLang = topLanguages[0]?.name || 'various languages';
    const achievementCount = achievements.length;

    return `🚀 My GitHub Wrapped 2025!

📊 ${totalCommits} commits
⭐ ${totalStars} stars earned
🔥 ${longestStreak}-day streak
${archetype.emoji} ${archetype.name}
🏆 ${achievementCount} achievements unlocked

Top language: ${topLang}

Check out your own stats with GitHub Wrapped CLI!
#GitHubWrapped #DevLife`;
  }

  getTwitterShareURL(): string {
    const text = this.generateShareText();
    const encodedText = encodeURIComponent(text);
    const url = encodeURIComponent('https://github.com/yourusername/github-wrapped-cli');
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`;
  }

  getLinkedInShareURL(): string {
    const url = encodeURIComponent('https://github.com/yourusername/github-wrapped-cli');
    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }

  saveShareLinks(filename: string = 'share-links.txt'): string {
    const outputPath = join(process.cwd(), filename);
    const content = `
GitHub Wrapped 2025 - Share Links
==================================

YOUR STATS:
${this.generateShareText()}

SHARE ON TWITTER:
${this.getTwitterShareURL()}

SHARE ON LINKEDIN:
${this.getLinkedInShareURL()}

Copy the text above and paste it when sharing on LinkedIn!

TIP: Export your stats card first (SVG) and attach it to your post for maximum impact!
Convert SVG to PNG at: https://cloudconvert.com/svg-to-png
`;
    writeFileSync(outputPath, content);
    return outputPath;
  }
}
