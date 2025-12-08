import { chromium, Browser } from 'playwright';
import { promises as fs, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { WrappedStats } from './types.js';
import { calculateScore, determineTier, getTierName, type Tier } from './tier-calculator.js';
import { fetchAvatarAsBase64 } from './utils/avatar-fetcher.js';
import { injectDataIntoTemplate } from './utils/html-injector.js';
import { getBrowserInstaller } from './utils/browser-installer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class PlaywrightExporter {
  private stats: WrappedStats;
  private tier: Tier;
  private score: number;
  private browser: Browser | null = null;

  constructor(stats: WrappedStats) {
    this.stats = stats;
    this.score = calculateScore(stats);
    this.tier = determineTier(this.score);
  }

  /**
   * Main export method - generates PNG from HTML template using Playwright
   */
  async exportPNG(onProgress?: (status: string) => void): Promise<string> {
    try {
      // Check browser installation status
      const browserInstaller = getBrowserInstaller();

      if (browserInstaller.isInstalling()) {
        onProgress?.('Finalizing Chromium setup (one-time)...');
        await browserInstaller.ensureReady();
        onProgress?.('Setup complete!');
      } else if (!browserInstaller.isReady()) {
        // If background install hasn't started or failed, try to ensure it's ready
        onProgress?.('Checking Chromium installation...');
        await browserInstaller.ensureReady();
      }

      onProgress?.('Loading template and fetching avatar...');
      const [htmlTemplate, avatarBase64] = await Promise.all([
        Promise.resolve(readFileSync(this.getTemplatePath(this.tier), 'utf-8')),
        fetchAvatarAsBase64(
          this.stats.user.avatar_url,
          (msg) => onProgress?.(`${msg}`)
        )
      ]);

      onProgress?.('Preparing data...');
      const htmlContent = injectDataIntoTemplate(htmlTemplate, {
        username: this.stats.user.login,
        prs: this.stats.totalPRs,
        commits: this.stats.totalCommits,
        repos: this.stats.totalRepos,
        archetype: this.stats.archetype.name,
        randomId: Math.floor(Math.random() * 9000) + 1000,
        avatarBase64,
        tier: this.tier
      });

      onProgress?.('Rendering image...');
      const screenshotBuffer = await this.renderHTMLToPNG(htmlContent, onProgress);

      onProgress?.('Saving file...');
      const outputPath = await this.saveFile(screenshotBuffer);

      await this.closeBrowser();

      return outputPath;
    } catch (error) {
      await this.closeBrowser();

      if (error instanceof Error && error.message?.includes('browserType.launch')) {
        throw new Error(
          'Chromium browser not installed!\n\n' +
          'Install with: bunx playwright install chromium\n' +
          'Then retry export with [R]'
        );
      }

      throw error;
    }
  }


  /**
   * Get template file path for a specific tier with validation
   */
  private getTemplatePath(tier: Tier): string {
    const paths = [
      join(__dirname, 'templates', `${tier}.html`),
      join(__dirname, '../src/templates', `${tier}.html`)
    ];

    for (const path of paths) {
      try {
        const content = readFileSync(path, 'utf-8');
        if (!content.includes('class="card"')) {
          throw new Error(`Template missing .card element: ${path}`);
        }
        return path;
      } catch (err) {
        continue;
      }
    }

    throw new Error(
      `Template not found for tier "${tier}".\n` +
      `Searched paths:\n${paths.map(p => `  - ${p}`).join('\n')}`
    );
  }

  /**
   * Render HTML content to PNG using Playwright
   */
  private async renderHTMLToPNG(htmlContent: string, onProgress?: (status: string) => void): Promise<Buffer> {
    onProgress?.('Starting browser...');
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-dev-tools',
        '--disable-extensions',
        '--force-color-profile=srgb'
      ],
      timeout: 60000
    });

    const page = await this.browser.newPage();
    await page.setViewportSize({ width: 440, height: 680 });

    onProgress?.('Loading page...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle',
      timeout: 15000
    });

    onProgress?.('Loading fonts...');
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      page.waitForTimeout(4000)
    ]);

    await page.waitForTimeout(500);

    onProgress?.('Capturing screenshot...');
    const cardElement = await page.$('.card');
    if (!cardElement) {
      throw new Error('Card element not found in template');
    }

    const boundingBox = await cardElement.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not get card bounding box');
    }

    const padding = 20;
    const clip = {
      x: Math.max(0, boundingBox.x - padding),
      y: Math.max(0, boundingBox.y - padding),
      width: boundingBox.width + (padding * 2),
      height: boundingBox.height + (padding * 2)
    };

    const screenshot = await page.screenshot({
      type: 'png',
      omitBackground: false,
      clip: clip
    });

    return screenshot as Buffer;
  }

  /**
   * Save PNG buffer to file (async)
   */
  private async saveFile(buffer: Buffer): Promise<string> {
    const filename = `github-wrapped-${this.stats.year}-${this.stats.user.login}-${this.tier}.png`;
    const outputPath = join(process.cwd(), filename);

    await fs.writeFile(outputPath, buffer);

    return outputPath;
  }

  /**
   * Close browser instance
   */
  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Get tier information for display
   */
  getTierInfo(): { tier: Tier; tierName: string; score: number } {
    return {
      tier: this.tier,
      tierName: getTierName(this.tier),
      score: this.score,
    };
  }
}
