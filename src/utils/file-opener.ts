import { exec } from 'child_process';
import { platform } from 'os';

/**
 * Opens a file or URL with the default system application
 * Works reliably across all Windows terminals (CMD, PowerShell, Git Bash, VSCode)
 *
 * Uses exec() which spawns a shell by default, ensuring compatibility:
 * - Windows: Uses process.env.ComSpec (cmd.exe) to access 'start' command
 * - CMD: Direct access to 'start' command
 * - PowerShell: exec() invokes cmd.exe automatically
 * - Git Bash: sh.exe wrapper routes through cmd.exe
 *
 * @param filePath - Path to a file or a URL to open
 */
export function openFile(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const os = platform();

    try {
      if (os === 'win32') {
        // Windows: Use 'start' command with shell: true for universal compatibility
        //
        // Why this works everywhere:
        // - 'start' is a CMD-internal command (not a standalone executable)
        // - shell: true uses process.env.ComSpec (usually cmd.exe) on Windows
        // - Works in CMD (native), PowerShell (invokes cmd), Git Bash (sh.exe wrapper calls cmd)
        //
        // The empty quotes "" are the window title (required!)
        // Without them, paths with spaces get mistaken for the title
        const command = `start "" "${filePath}"`;

        // exec() uses shell by default on Windows (cmd.exe via process.env.ComSpec)
        exec(command, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else if (os === 'darwin') {
        // macOS: Use 'open' command
        exec(`open "${filePath}"`, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        // Linux: Use 'xdg-open'
        exec(`xdg-open "${filePath}"`, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    } catch (error) {
      reject(error);
    }
  });
}
