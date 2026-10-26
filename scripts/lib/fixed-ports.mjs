import fs from 'node:fs';
import path from 'node:path';

// Build output and installed packages can hold copies of the app's own code.
const SKIP = new Set(['node_modules', '.next', 'out']);
const CODE = /\.(ts|tsx|js|mjs)$/;
const FIXED = /\b(?:localhost|127\.0\.0\.1):(\d+)/g;

export function findFixedPorts(appDir) {
  const hits = [];
  for (const folder of ['src', 'tests']) {
    const root = path.join(appDir, folder);
    if (!fs.existsSync(root)) continue;
    for (const rel of fs.readdirSync(root, { recursive: true })) {
      const parts = rel.split(path.sep);
      if (!CODE.test(rel) || parts.some((p) => SKIP.has(p))) continue;
      const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
      lines.forEach((text, i) => {
        for (const m of text.matchAll(FIXED)) {
          hits.push({ file: [folder, ...parts].join('/'), line: i + 1, port: Number(m[1]) });
        }
      });
    }
  }
  return hits;
}
