// Worker script that runs with Node.js to handle Satori export
// This works around Bun + WASM incompatibility in Git Bash
// Uses file-based IPC to avoid Bun's Windows pipe issues
import satori from 'satori';
import sharp from 'sharp';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read input from file (passed as command-line argument)
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('[WORKER ERROR] Missing arguments: node export-worker.mjs <inputFile> <outputFile>');
  process.exit(1);
}

(async () => {
  try {
    const input = JSON.parse(readFileSync(inputFile, 'utf-8'));
    const { stats, filename, format } = input;

    // Load font
    const fontPath = join(__dirname, 'fonts', 'PressStart2P-Regular.ttf');
    const fontBuffer = readFileSync(fontPath);
    const fontData = fontBuffer.buffer.slice(
      fontBuffer.byteOffset,
      fontBuffer.byteOffset + fontBuffer.byteLength
    );

    // Generate JSX
    const jsx = generateJSX(stats);

    // Generate SVG
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

    if (format === 'svg') {
      writeFileSync(filename, svg);
    } else {
      // Convert SVG to PNG using Sharp (better Windows support than resvg)
      const pngBuffer = await sharp(Buffer.from(svg))
        .resize(1500) // High resolution output
        .png()
        .toBuffer();
      writeFileSync(filename, pngBuffer);
    }

    // Write result to output file
    const result = { success: true, path: filename };
    writeFileSync(outputFile, JSON.stringify(result));

    // Clean up input file
    try { unlinkSync(inputFile); } catch (e) {}

    process.exit(0);
  } catch (error) {
    // Write error to output file
    const result = { success: false, error: error.message };
    writeFileSync(outputFile, JSON.stringify(result));

    // Clean up input file
    try { unlinkSync(inputFile); } catch (e) {}

    process.exit(1);
  }
})();

function generateJSX(stats) {
  const user = stats.user || { login: 'unknown' };
  const totalCommits = stats.totalCommits || 0;
  const totalRepos = stats.totalRepos || 0;
  const totalPRs = stats.totalPRs || 0;
  const topLanguages = stats.topLanguages || [];
  const archetype = stats.archetype || { name: 'Developer', emoji: '💻' };

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
