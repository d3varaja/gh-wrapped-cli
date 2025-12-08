import { spawn, exec } from 'child_process';
import { platform } from 'os';

/**
 * Opens a file or URL with the default system application
 * Works reliably in VSCode terminal and all environments
 *
 * @param filePath - Path to a file or a URL to open
 */
export function openFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform();

    try {
      if (os === 'win32') {
        // Windows: Use 'start' command with empty title to handle spaces
        // The empty quotes "" are required to prevent filenames with spaces
        // from being mistaken for window title
        exec(`start "" "${filePath}"`, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else if (os === 'darwin') {
        // macOS: Use 'open' command
        const child = spawn('open', [filePath], { detached: true });
        child.unref();
        child.on('error', reject);
        child.on('spawn', () => resolve());
      } else {
        // Linux: Use 'xdg-open'
        const child = spawn('xdg-open', [filePath], { detached: true });
        child.unref();
        child.on('error', reject);
        child.on('spawn', () => resolve());
      }
    } catch (error) {
      reject(error);
    }
  });
}
