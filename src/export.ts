import puppeteer from 'puppeteer';
import type { WrappedStats } from './types.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class Exporter {
  private stats: WrappedStats;

  constructor(stats: WrappedStats) {
    this.stats = stats;
  }

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'mythic':
        return '#FF00FF'; // Magenta
      case 'legendary':
        return '#FFD700'; // Gold
      case 'epic':
        return '#9B59B6'; // Purple
      case 'rare':
        return '#4A9EFF'; // Blue
      case 'common':
        return '#CCCCCC'; // Gray
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

    // Sort achievements by rarity (higher rarity first) and take top 3
    return achievements
      .sort((a, b) => this.getRarityPriority(a.rarity) - this.getRarityPriority(b.rarity))
      .slice(0, 3)
      .map(achievement => ({
        emoji: achievement.emoji,
        text: achievement.name.toUpperCase(),
        color: this.getRarityColor(achievement.rarity)
      }));
  }

  private generateHTML(): string {
    const { user, totalCommits, totalRepos, totalStars, longestStreak, topLanguages, archetype, achievements, peakHour, totalPRs, totalIssues, avgCommitsPerDay, insights } = this.stats;

    // Determine rarity based on achievements
    const rarity = achievements.length >= 5 ? 'LEGENDARY' : achievements.length >= 3 ? 'RARE' : 'COMMON';
    const rarityColor = achievements.length >= 5 ? '#FFD700' : achievements.length >= 3 ? '#4A9EFF' : '#CCCCCC';

    // Calculate achievement badges
    const achievementBadges = this.calculateAchievementBadges();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    /* Holographic animation */
    @keyframes holographic {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes glow {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    body {
      font-family: 'Press Start 2P', monospace;
      background: #000000;
      width: 750px;
      height: 1050px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      overflow: hidden;
      perspective: 1000px;
    }

    /* Animated background glow */
    body::before {
      content: '';
      position: absolute;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(102, 126, 234, 0.08) 0%, transparent 70%);
      animation: float 6s ease-in-out infinite;
    }

    .card {
      background: linear-gradient(135deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%);
      border-radius: 20px;
      width: 100%;
      height: 100%;
      padding: 18px;
      display: flex;
      flex-direction: column;
      position: relative;
      transform: rotateX(1deg) rotateY(-1deg);
      transform-style: preserve-3d;

      /* Holographic border effect */
      border: 3px solid transparent;
      background-clip: padding-box;
      box-shadow:
        0 0 20px rgba(102, 126, 234, 0.4),
        0 0 40px rgba(118, 75, 162, 0.3),
        0 0 60px rgba(79, 172, 254, 0.2),
        inset 0 0 40px rgba(102, 126, 234, 0.05);
    }

    .card::before {
      content: '';
      position: absolute;
      top: -3px;
      left: -3px;
      right: -3px;
      bottom: -3px;
      background: linear-gradient(
        45deg,
        #667eea 0%,
        #764ba2 25%,
        #f093fb 50%,
        #4facfe 75%,
        #667eea 100%
      );
      background-size: 300% 300%;
      border-radius: 20px;
      z-index: -1;
      animation: holographic 4s ease infinite;
      opacity: 0.8;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .title {
      font-size: 18px;
      color: #4facfe;
      letter-spacing: 2px;
      text-shadow:
        0 0 10px rgba(79, 172, 254, 0.8),
        0 0 20px rgba(79, 172, 254, 0.4);
      animation: glow 3s ease-in-out infinite;
    }

    .rarity-badge {
      font-size: 14px;
      color: ${rarityColor};
      padding: 8px 16px;
      border: 3px solid ${rarityColor};
      border-radius: 8px;
      letter-spacing: 1px;
      box-shadow:
        0 0 10px ${rarityColor},
        0 0 20px ${rarityColor},
        inset 0 0 10px rgba(255, 255, 255, 0.1);
      animation: glow 2s ease-in-out infinite;
    }

    /* Avatar Container */
    .avatar-container {
      width: 100%;
      height: 400px;
      border: 5px solid #4facfe;
      border-radius: 14px;
      overflow: hidden;
      position: relative;
      margin-bottom: 12px;
      box-shadow:
        0 0 15px rgba(79, 172, 254, 0.4),
        0 0 30px rgba(79, 172, 254, 0.2),
        inset 0 0 20px rgba(79, 172, 254, 0.05);
    }

    .avatar {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .rare-overlay {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(10, 10, 10, 0.95);
      border: 4px solid ${rarityColor};
      padding: 12px 48px;
      font-size: 20px;
      color: ${rarityColor};
      letter-spacing: 4px;
      margin-bottom: 20px;
    }

    /* Username */
    .username {
      font-size: 24px;
      color: #f093fb;
      text-align: center;
      margin-bottom: 16px;
      letter-spacing: 2px;
      text-shadow:
        0 0 10px rgba(240, 147, 251, 0.6),
        0 0 20px rgba(240, 147, 251, 0.3);
      animation: glow 3s ease-in-out infinite;
    }

    /* Stats Grid */
    .stats-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
      justify-content: center;
    }

    .stat-box {
      flex: 1;
      border: 3px solid;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      transform: translateZ(20px);
      transition: transform 0.3s ease;
    }

    .stat-box:nth-child(1) {
      border-color: #f093fb;
      box-shadow:
        0 0 10px rgba(240, 147, 251, 0.4),
        0 0 20px rgba(240, 147, 251, 0.2),
        inset 0 0 15px rgba(240, 147, 251, 0.05);
    }

    .stat-box:nth-child(2) {
      border-color: #4facfe;
      box-shadow:
        0 0 10px rgba(79, 172, 254, 0.4),
        0 0 20px rgba(79, 172, 254, 0.2),
        inset 0 0 15px rgba(79, 172, 254, 0.05);
    }

    .stat-box:nth-child(3) {
      border-color: #667eea;
      box-shadow:
        0 0 10px rgba(102, 126, 234, 0.4),
        0 0 20px rgba(102, 126, 234, 0.2),
        inset 0 0 15px rgba(102, 126, 234, 0.05);
    }

    .stat-value {
      font-size: 36px;
      margin-bottom: 8px;
      letter-spacing: 2px;
    }

    .stat-box:nth-child(1) .stat-value {
      color: #f093fb;
      text-shadow:
        0 0 10px rgba(240, 147, 251, 0.6),
        0 0 20px rgba(240, 147, 251, 0.3);
    }

    .stat-box:nth-child(2) .stat-value {
      color: #4facfe;
      text-shadow:
        0 0 10px rgba(79, 172, 254, 0.6),
        0 0 20px rgba(79, 172, 254, 0.3);
    }

    .stat-box:nth-child(3) .stat-value {
      color: #667eea;
      text-shadow:
        0 0 10px rgba(102, 126, 234, 0.6),
        0 0 20px rgba(102, 126, 234, 0.3);
    }

    .stat-label {
      font-size: 12px;
      color: #888;
      letter-spacing: 2px;
    }

    /* Archetype Box */
    .archetype-box {
      border: 3px solid #764ba2;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      background: rgba(0, 0, 0, 0.5);
      margin-bottom: 12px;
      transform: translateZ(15px);
      box-shadow:
        0 0 15px rgba(118, 75, 162, 0.4),
        0 0 30px rgba(118, 75, 162, 0.2),
        inset 0 0 20px rgba(118, 75, 162, 0.05);
    }

    .archetype-name {
      font-size: 20px;
      color: #f093fb;
      margin-bottom: 8px;
      letter-spacing: 2px;
      text-shadow:
        0 0 10px rgba(240, 147, 251, 0.6),
        0 0 20px rgba(240, 147, 251, 0.3);
      animation: glow 2.5s ease-in-out infinite;
    }

    .archetype-type {
      font-size: 12px;
      color: #888;
      margin-bottom: 12px;
      letter-spacing: 2px;
    }

    .languages {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .language-tag {
      font-size: 10px;
      color: #4facfe;
      border: 2px solid #4facfe;
      padding: 6px 12px;
      border-radius: 6px;
      letter-spacing: 1px;
      box-shadow:
        0 0 5px rgba(79, 172, 254, 0.4),
        0 0 10px rgba(79, 172, 254, 0.2),
        inset 0 0 5px rgba(79, 172, 254, 0.05);
      text-shadow: 0 0 5px rgba(79, 172, 254, 0.5);
    }

    /* Achievement Badges */
    .achievements-container {
      display: flex;
      gap: 10px;
      justify-content: center;
      align-items: center;
      margin: 16px 0;
      flex-wrap: wrap;
      padding: 0 8px;
    }

    .achievement-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border: 3px solid;
      border-radius: 20px;
      font-size: 9px;
      letter-spacing: 1px;
      background: rgba(0, 0, 0, 0.7);
      transform: translateZ(10px);
      transition: all 0.3s ease;
      box-shadow:
        0 0 10px currentColor,
        0 0 20px rgba(0, 0, 0, 0.5),
        inset 0 0 10px rgba(255, 255, 255, 0.05);
    }

    .achievement-emoji {
      font-size: 16px;
      filter: drop-shadow(0 0 4px currentColor);
    }

    .achievement-text {
      font-weight: bold;
      text-shadow: 0 0 6px currentColor;
    }

    /* Divider */
    .divider {
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(102, 126, 234, 0.5) 20%,
        rgba(118, 75, 162, 0.8) 50%,
        rgba(102, 126, 234, 0.5) 80%,
        transparent 100%
      );
      margin: 12px 0;
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 12px;
    }

    .footer-left {
      font-size: 12px;
      color: #4facfe;
      letter-spacing: 1px;
      text-shadow: 0 0 8px rgba(79, 172, 254, 0.5);
    }

    .footer-right {
      font-size: 12px;
      color: #999;
      letter-spacing: 2px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">GITHUB WRAPPED 2025</div>
      <div class="rarity-badge">${rarity}</div>
    </div>

    <div class="avatar-container">
      <img src="${user.avatar_url}" alt="Profile" class="avatar" />
    </div>

    <div class="username">@${user.login}</div>

    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-value" data-target="${totalPRs}">0</div>
        <div class="stat-label">PRS</div>
      </div>

      <div class="stat-box">
        <div class="stat-value" data-target="${totalCommits}">0</div>
        <div class="stat-label">COMMITS</div>
      </div>

      <div class="stat-box">
        <div class="stat-value" data-target="${totalRepos}">0</div>
        <div class="stat-label">REPOS</div>
      </div>
    </div>

    <div class="archetype-box">
      <div class="archetype-name">${archetype.name.toUpperCase()}</div>
      <div class="archetype-type">TYPE: ${archetype.emoji} ${peakHour >= 22 || peakHour <= 5 ? 'NOCTURNAL' : 'NORMAL'}</div>
      <div class="languages">
        ${topLanguages.slice(0, 3).map(lang =>
          `<span class="language-tag">${lang.name.toUpperCase()}</span>`
        ).join('')}
      </div>
    </div>

    ${achievementBadges.length > 0 ? `
    <div class="achievements-container">
      ${achievementBadges.map(badge => `
        <div class="achievement-badge" style="border-color: ${badge.color}; color: ${badge.color};">
          <span class="achievement-emoji">${badge.emoji}</span>
          <span class="achievement-text">${badge.text}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="divider"></div>

    <div class="footer">
      <div class="footer-left">#${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}</div>
      <div class="footer-right">2025 EDITION</div>
    </div>
  </div>

  <script>
    // Animated counter effect
    function animateCounter(element, target, duration = 1000) {
      const start = 0;
      const increment = target / (duration / 16);
      let current = start;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          element.textContent = target.toLocaleString();
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    }

    // Run animations when page loads
    window.addEventListener('load', () => {
      const statValues = document.querySelectorAll('.stat-value');
      statValues.forEach((element, index) => {
        const target = parseInt(element.getAttribute('data-target'));
        setTimeout(() => {
          animateCounter(element, target, 1500);
        }, index * 200); // Stagger the animations
      });
    });
  </script>
</body>
</html>
    `;
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
    const outputDir = process.cwd();
    const outputPath = join(outputDir, filename);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setViewport({
        width: 750,
        height: 1050,
        deviceScaleFactor: 2,
      });

      await page.setContent(this.generateHTML(), {
        waitUntil: 'networkidle0',
      });

      await page.evaluateHandle('document.fonts.ready');
      await new Promise(resolve => setTimeout(resolve, 2500));

      await page.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: false,
      });

      return outputPath;
    } finally {
      await browser.close();
    }
  }

  async exportSVG(filename: string = 'gh-wrapped.svg'): Promise<string> {
    const outputDir = process.cwd();
    const outputPath = join(outputDir, filename);

    const { user, totalCommits, totalRepos, totalStars, longestStreak, topLanguages, archetype, achievements } = this.stats;

    // Generate SVG content
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="750" height="1050" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0e27;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1f3a;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="750" height="1050" fill="url(#bgGradient)"/>

  <!-- Header -->
  <text x="375" y="60" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="#00FF41" text-anchor="middle">
    GITHUB WRAPPED 2025
  </text>

  <!-- Username -->
  <text x="375" y="120" font-family="Arial, sans-serif" font-size="28" fill="#FFFFFF" text-anchor="middle">
    @${user.login}
  </text>

  <!-- Stats Grid -->
  <g transform="translate(75, 180)">
    <!-- Commits -->
    <rect x="0" y="0" width="280" height="120" rx="15" fill="#1a1f3a" stroke="#00FF41" stroke-width="2"/>
    <text x="140" y="45" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#00FF41" text-anchor="middle">
      ${totalCommits}
    </text>
    <text x="140" y="75" font-family="Arial, sans-serif" font-size="18" fill="#CCCCCC" text-anchor="middle">
      Commits
    </text>

    <!-- Stars -->
    <rect x="320" y="0" width="280" height="120" rx="15" fill="#1a1f3a" stroke="#FFD700" stroke-width="2"/>
    <text x="460" y="45" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#FFD700" text-anchor="middle">
      ${totalStars}
    </text>
    <text x="460" y="75" font-family="Arial, sans-serif" font-size="18" fill="#CCCCCC" text-anchor="middle">
      Stars
    </text>

    <!-- Repos -->
    <rect x="0" y="150" width="280" height="120" rx="15" fill="#1a1f3a" stroke="#00FF41" stroke-width="2"/>
    <text x="140" y="195" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#00FF41" text-anchor="middle">
      ${totalRepos}
    </text>
    <text x="140" y="225" font-family="Arial, sans-serif" font-size="18" fill="#CCCCCC" text-anchor="middle">
      Repositories
    </text>

    <!-- Streak -->
    <rect x="320" y="150" width="280" height="120" rx="15" fill="#1a1f3a" stroke="#FFA500" stroke-width="2"/>
    <text x="460" y="195" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#FFA500" text-anchor="middle">
      ${longestStreak}
    </text>
    <text x="460" y="225" font-family="Arial, sans-serif" font-size="18" fill="#CCCCCC" text-anchor="middle">
      Day Streak
    </text>
  </g>

  <!-- Languages -->
  <text x="375" y="560" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    Top Languages
  </text>
  <g transform="translate(150, 590)">
    ${topLanguages.slice(0, 3).map((lang, i) => `
      <text x="0" y="${i * 40 + 20}" font-family="Arial, sans-serif" font-size="18" fill="#FFFFFF">
        ${lang.name}
      </text>
      <text x="400" y="${i * 40 + 20}" font-family="Arial, sans-serif" font-size="18" fill="#00FF41" text-anchor="end">
        ${lang.percentage.toFixed(1)}%
      </text>
    `).join('')}
  </g>

  <!-- Archetype -->
  <text x="375" y="760" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    ${archetype.emoji} ${archetype.name}
  </text>
  <text x="375" y="795" font-family="Arial, sans-serif" font-size="16" fill="#CCCCCC" text-anchor="middle">
    ${archetype.description}
  </text>

  <!-- Achievements -->
  <text x="375" y="880" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#FFFFFF" text-anchor="middle">
    🏆 ${achievements.length} Achievements
  </text>
  <g transform="translate(200, 910)">
    ${achievements.slice(0, 3).map((ach, i) => `
      <text x="${i * 120}" y="20" font-family="Arial, sans-serif" font-size="32">
        ${ach.emoji}
      </text>
    `).join('')}
  </g>

  <!-- Footer -->
  <text x="375" y="1000" font-family="Arial, sans-serif" font-size="14" fill="#666666" text-anchor="middle">
    Generated with GitHub Wrapped CLI
  </text>
</svg>`;

    writeFileSync(outputPath, svgContent);
    return outputPath;
  }

  async exportGIF(filename: string = 'gh-wrapped.gif'): Promise<string> {
    // For GIF, we'll create an animated version that cycles through key stats
    // This is a placeholder - actual GIF generation would require additional libraries
    // For now, we'll just export a PNG and inform the user
    const outputPath = join(process.cwd(), filename);

    // Create a simple info message
    const message = `GIF export is currently in development.
For now, please use PNG format for the best quality export.
You can create a GIF from the PNG using online tools like:
- ezgif.com
- gifmaker.me

PNG exported instead: ${await this.exportPNG()}`;

    writeFileSync(outputPath.replace('.gif', '.txt'), message);

    // Return the PNG path as fallback
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
    const url = encodeURIComponent('https://github.com/yourusername/github-wrapped-cli'); // Update with actual repo URL
    return `https://twitter.com/intent/tweet?text=${encodedText}&url=${url}`;
  }

  getLinkedInShareURL(): string {
    // LinkedIn doesn't support pre-filled text via URL, so we provide a direct share URL
    // Users will need to paste their text manually
    const url = encodeURIComponent('https://github.com/yourusername/github-wrapped-cli'); // Update with actual repo URL
    const title = encodeURIComponent('My GitHub Wrapped 2025');
    const summary = encodeURIComponent(this.generateShareText());
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
}
