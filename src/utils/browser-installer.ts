import { exec } from 'child_process';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { detectPlatform } from './platform-detector.js';

const execAsync = promisify(exec);

export type InstallationStatus = 'checking' | 'installing' | 'ready' | 'error';

export class BackgroundBrowserInstaller {
  private status: InstallationStatus = 'checking';
  private installPromise: Promise<void> | null = null;
  private error: Error | null = null;
  private progress: string = '';

  /**
   * Check if Chromium is installed
   */
  private async isChromiumInstalled(): Promise<boolean> {
    const platform = detectPlatform();

    if (platform.isTermux) {
      // Check system chromium for Termux
      return platform.chromiumPath
        ? existsSync(platform.chromiumPath)
        : false;
    }

    // Check playwright chromium for regular environments
    try {
      const { chromium } = await import('playwright');
      const executablePath = chromium.executablePath();
      return existsSync(executablePath);
    } catch {
      return false;
    }
  }

  /**
   * Start background installation check/install
   */
  public startBackgroundInstall(): void {
    if (this.installPromise) return; // Already started

    this.installPromise = this.checkAndInstall();
  }

  /**
   * Check and install if needed (runs in background)
   */
  private async checkAndInstall(): Promise<void> {
    try {
      this.status = 'checking';
      const platform = detectPlatform();

      if (await this.isChromiumInstalled()) {
        this.status = 'ready';
        return;
      }

      // Termux requires manual installation
      if (platform.isTermux) {
        this.status = 'error';
        this.error = new Error(
          'Termux requires system Chromium.\n\n' +
          'Install with:\n' +
          '  pkg install chromium\n\n' +
          'Set environment:\n' +
          '  export CHROMIUM_PATH=/data/data/com.termux/files/usr/bin/chromium-browser\n\n' +
          'Add to ~/.bashrc for persistence'
        );
        this.progress = 'Manual installation required';
        return;
      }

      // Regular environment - auto-install
      this.status = 'installing';
      this.progress = 'Installing Chromium (one-time, ~200MB)...';

      const isUsingBun = process.env.npm_execpath?.includes('bun') ||
                         process.argv[0]?.includes('bun');

      const command = isUsingBun
        ? 'bunx playwright install chromium --with-deps'
        : 'npx playwright install chromium --with-deps';

      // Run installation (this takes 1-2 minutes)
      await execAsync(command, {
        timeout: 300000, // 5 minute timeout
      });

      this.status = 'ready';
      this.progress = 'Chromium ready!';
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error : new Error(String(error));
      this.progress = 'Installation failed';
    }
  }

  /**
   * Wait for installation to complete (if in progress)
   * Returns immediately if already ready
   */
  public async ensureReady(): Promise<void> {
    if (this.status === 'ready') {
      return; // Already ready
    }

    // Wait for installation to complete
    if (this.installPromise) {
      await this.installPromise;
    }

    // Check final status after waiting
    if (this.status === 'error') {
      throw new Error(
        'Chromium installation failed.\n\n' +
        'Please install manually:\n' +
        '  bunx playwright install chromium\n\n' +
        `Error: ${this.error?.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Get current status
   */
  public getStatus(): InstallationStatus {
    return this.status;
  }

  /**
   * Get progress message
   */
  public getProgress(): string {
    return this.progress;
  }

  /**
   * Check if installation is in progress
   */
  public isInstalling(): boolean {
    return this.status === 'installing';
  }

  /**
   * Check if ready to use
   */
  public isReady(): boolean {
    return this.status === 'ready';
  }
}

// Singleton instance
let installerInstance: BackgroundBrowserInstaller | null = null;

/**
 * Get the global browser installer instance
 */
export function getBrowserInstaller(): BackgroundBrowserInstaller {
  if (!installerInstance) {
    installerInstance = new BackgroundBrowserInstaller();
  }
  return installerInstance;
}
