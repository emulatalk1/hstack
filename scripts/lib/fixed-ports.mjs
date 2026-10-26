import fs from 'node:fs';
import path from 'node:path';

// Build output and installed packages can hold copies of the app's own code.
const SKIP = new Set(['node_modules', '.next', 'out']);
const FIXED = /\b(?:localhost|127\.0\.0\.1):(\d+)/g;

export async function findFixedPorts(appDir) {
  const hits = [];
  for (const folder of ['src', 'tests']) {
    const root = path.join(appDir, folder);
    if (!fs.statSync(root, { throwIfNoEntry: false })?.isDirectory()) continue;
    for await (const rel of new Bun.Glob('**/*.{ts,tsx,js,mjs}').scan({ cwd: root, dot: true, followSymlinks: true })) {
      const parts = rel.split(/[\\/]/);
      if (parts.some((p) => SKIP.has(p))) continue;
      const lines = (await Bun.file(path.join(root, rel)).text()).split('\n');
      lines.forEach((text, i) => {
        for (const m of text.matchAll(FIXED)) {
          hits.push({ file: [folder, ...parts].join('/'), line: i + 1, port: Number(m[1]) });
        }
      });
    }
  }
  // Glob gives no fixed order.
  return hits.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line));
}
