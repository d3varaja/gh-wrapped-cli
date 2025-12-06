import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { WrappedStats } from './types.js';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import React from 'react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class Exporter {
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

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'mythic':
        return '#FF00FF';
      case 'legendary':
        return '#FFD700';
      case 'epic':
        return '#9B59B6';
      case 'rare':
        return '#4A9EFF';
      case 'common':
        return '#CCCCCC';
      default:
        return '#CCCCCC';
    }
  }

  private getRarityPriority(rarity: string): number {
    switch (rarity) {
      case 'mythic':
        return 1;
      case 'legendary':
        return 2;
      case 'epic':
        return 3;
      case 'rare':
        return 4;
      case 'common':
        return 5;
      default:
        return 6;
    }
  }

  private calculateAchievementBadges(): Array<{emoji: string, text: string, color: string}> {
    const { achievements } = this.stats;
    return achievements
      .sort((a, b) => this.getRarityPriority(a.rarity) - this.getRarityPriority(b.rarity))
      .slice(0, 3)
      .map(achievement => ({
        emoji: achievement.emoji,
        text: achievement.name.toUpperCase(),
        color: this.getRarityColor(achievement.rarity)
      }));
  }

  async exportImage(format: 'png' | 'svg' | 'gif' = 'png'): Promise<string> {
    switch (format) {
      case 'svg':
        return this.exportSVG();
      case 'gif':
        return this.exportGIF();
      case 'png':
      default:
        return this.exportPNG();
    }
  }

  async exportPNG(filename: string = 'gh-wrapped.png'): Promise<string> {
    return this.exportViaNodeWorker(filename, 'png');
  }

  private async exportViaNodeWorker(filename: string, format: 'png' | 'svg'): Promise<string> {
    const outputPath = join(process.cwd(), filename);
    const tmpDir = process.env.TEMP || process.env.TMP || '/tmp';
    const randomId = Math.random().toString(36).substring(7);
    const inputFile = join(tmpDir, `gh-wrapped-input-${randomId}.json`);
    const outputFile = join(tmpDir, `gh-wrapped-output-${randomId}.json`);

    return new Promise((resolve, reject) => {
      (async () => {
        try {
          // Write input to temporary file
          const input = {
            stats: this.stats,
            filename: outputPath,
            format,
          };
          writeFileSync(inputFile, JSON.stringify(input));

          // Worker script path
          const workerPath = join(__dirname, 'export-worker.mjs');
          const nodeBin = 'node';

          // Spawn worker with file paths as arguments (no pipes needed!)
          const proc = Bun.spawn([nodeBin, workerPath, inputFile, outputFile], {
            stderr: 'inherit',
          });

          // Wait for worker to finish
          const exitCode = await proc.exited;

          // Read result from output file
          if (!require('fs').existsSync(outputFile)) {
            reject(new Error('Worker did not create output file'));
            return;
          }

          const resultJson = readFileSync(outputFile, 'utf-8');
          const result = JSON.parse(resultJson);

          // Clean up output file
          try {
            require('fs').unlinkSync(outputFile);
          } catch (e) {}

          if (result.success) {
            resolve(result.path);
          } else {
            reject(new Error(result.error));
          }
        } catch (error: any) {
          // Clean up temp files
          try {
            require('fs').unlinkSync(inputFile);
          } catch (e) {}
          try {
            require('fs').unlinkSync(outputFile);
          } catch (e) {}
          reject(new Error(`Export failed: ${error.message}`));
        }
      })();
    });
  }

  async exportSVG(filename: string = 'gh-wrapped.svg'): Promise<string> {
    return this.exportViaNodeWorker(filename, 'svg');
  }

  async exportGIF(filename: string = 'gh-wrapped.gif'): Promise<string> {
    const outputPath = join(process.cwd(), filename);
    const message = `GIF export is currently in development.
For now, please use PNG format for the best quality export.
You can create a GIF from the PNG using online tools like:
- ezgif.com
- gifmaker.me

PNG exported instead: ${await this.exportPNG()}`;

    writeFileSync(outputPath.replace('.gif', '.txt'), message);
    return this.exportPNG(filename.replace('.gif', '.png'));
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

TIP: Export your stats card first (PNG/SVG) and attach it to your post for maximum impact!
`;

    writeFileSync(outputPath, content);
    return outputPath;
  }

  static async closeBrowser(): Promise<void> {
    // No-op for Satori (no browser needed)
    // Kept for backward compatibility
  }
}
