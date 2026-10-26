import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// The hash keeps two folders with the same name apart; a moved folder gets a new name on purpose.
export function projectName(dir) {
  const slug = path.basename(path.resolve(dir))
    .toLowerCase()
    .replace(/đ/g, 'd') // Đ has no accent to strip, so NFD leaves it alone
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|-+$/g, '') || 'project'; // Docker needs a leading letter or digit
  const hash = crypto.createHash('sha256').update(path.resolve(dir)).digest('hex').slice(0, 8);
  return `${slug}-${hash}`;
}

// Reads only the top-level `name:` line; a YAML library is not needed for that.
export function composeName(composeFile) {
  const text = fs.readFileSync(composeFile, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^name:\s*(.*)$/);
    if (!match) continue;
    let value = match[1].trim();
    const quoted = value.match(/^(["'])(.*?)\1/);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, '').trim();
    return value || null;
  }
  return null;
}
