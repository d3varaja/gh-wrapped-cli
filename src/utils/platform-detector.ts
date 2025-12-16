import { existsSync } from 'fs';

export interface PlatformConfig {
  isTermux: boolean;
  chromiumPath: string | null;
  browserPackage: 'playwright' | 'playwright-core';
  requiresSystemChromium: boolean;
}

/**
 * Detect if running on Termux and return platform-specific configuration
 */
export function detectPlatform(): PlatformConfig {
  // Allow manual override via environment variable
  if (process.env.FORCE_PLAYWRIGHT_CORE === 'true') {
    return {
      isTermux: true,
      chromiumPath: process.env.CHROMIUM_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser',
      browserPackage: 'playwright-core',
      requiresSystemChromium: true
    };
  }

  // Detection logic (in priority order):
  // 1. Check for CHROMIUM_PATH environment variable (explicit Termux setup)
  const chromiumPath = process.env.CHROMIUM_PATH;

  // 2. Check for PREFIX environment variable (Termux sets this)
  const hasTermuxPrefix = process.env.PREFIX === '/data/data/com.termux/files/usr';

  // 3. Check for Android platform
  const isAndroid = process.platform === 'android';

  // 4. Check if Termux chromium binary exists
  const defaultTermuxChromiumPath = '/data/data/com.termux/files/usr/bin/chromium-browser';
  const hasTermuxChromium = existsSync(defaultTermuxChromiumPath);

  const isTermux = Boolean(
    chromiumPath ||
    hasTermuxPrefix ||
    (isAndroid && hasTermuxChromium)
  );

  return {
    isTermux,
    chromiumPath: isTermux
      ? (chromiumPath || defaultTermuxChromiumPath)
      : null,
    browserPackage: isTermux ? 'playwright-core' : 'playwright',
    requiresSystemChromium: isTermux
  };
}

/**
 * Get the chromium executable path for the current platform
 * Returns undefined for non-Termux platforms (uses playwright's bundled chromium)
 */
export function getChromiumExecutablePath(): string | undefined {
  const config = detectPlatform();
  return config.chromiumPath || undefined;
}

/**
 * Validate Termux setup and return helpful error message if invalid
 */
export function validateTermuxSetup(): { valid: boolean; error?: string } {
  const config = detectPlatform();

  if (!config.isTermux) {
    return { valid: true };
  }

  if (!config.chromiumPath) {
    return {
      valid: false,
      error: 'CHROMIUM_PATH not set.\n\nRun: export CHROMIUM_PATH=/data/data/com.termux/files/usr/bin/chromium-browser'
    };
  }

  if (!existsSync(config.chromiumPath)) {
    return {
      valid: false,
      error: `Chromium not found at: ${config.chromiumPath}\n\nInstall with: pkg install chromium`
    };
  }

  return { valid: true };
}
