export interface TemplateData {
  username: string;
  prs: number;
  commits: number;
  repos: number;
  archetype: string;
  randomId: number;
  avatarBase64: string;
  tier: 'origin' | 'prime' | 'master';
}

/**
 * Inject user data into HTML template
 * Uses simple string replacement for placeholders
 */
export function injectDataIntoTemplate(
  htmlContent: string,
  data: TemplateData
): string {
  let result = htmlContent;

  result = result.replace(/@testuser/g, `@${data.username}`);

  const statsRegex = /<div class="stat-number">(\d+)<\/div>/g;
  const statsValues = [data.prs, data.commits, data.repos];
  let statIndex = 0;

  result = result.replace(statsRegex, () => {
    const value = statsValues[statIndex++] || 0;
    return `<div class="stat-number">${value}</div>`;
  });

  result = result.replace(
    /(<span class="type-label">TYPE:<\/span>\s*<span class="pixels"><\/span>\s*<span>)[^<]+(<\/span>)/,
    `$1${data.archetype.toUpperCase()}$2`
  );

  result = result.replace(/#\d+/, `#${data.randomId}`);

  if (data.avatarBase64) {
    result = result.replace(
      /(<div class="pixelated-avatar">)/,
      `<div class="pixelated-avatar" style="background-image: url('${data.avatarBase64}'); background-size: cover; background-position: center; image-rendering: pixelated;">`
    );
  }

  // Force body background for headless Chrome
  result = result.replace(
    /<body>/,
    '<body style="background: #050607 !important;">'
  );

  return result;
}
