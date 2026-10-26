import fs from 'node:fs';
import path from 'node:path';

const RESERVED = new Set(['index.md', 'log.md']);
// A quoted value keeps any "#" inside the quotes; an unquoted one loses a trailing " # comment".
const unquote = (s) => {
  const q = /^(["'])(.*?)\1(\s+#.*)?$/.exec(s.trim());
  return q ? q[2] : s.replace(/\s+#.*$/, '').trim();
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.md') ? [p] : [];
  });
}

// Returns { fields, body } or null when the file has no frontmatter block.
// Each top-level key maps to its text: the inline value plus any indented or "- " lines under it.
function readFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end < 0) return null;
  const fields = {};
  let key = null;
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      fields[key] = m[2];
    } else if (key && /^(\s|- )/.test(line)) fields[key] += '\n' + line;
  }
  return { fields, body: lines.slice(end + 1).join('\n') };
}

const allMatches = (text, re) => [...(text ?? '').matchAll(re)].map((m) => unquote(m[1]));
const links = (text) => allMatches(text, /\]\(([^)\s]+)\)/g);

// A link target resolves relative to the linking file's folder, or to the bundle root when it starts with "/".
function resolveTarget(docsDir, fromDir, target) {
  const clean = target.split('#')[0];
  return path.normalize(clean.startsWith('/') ? path.join(docsDir, clean) : path.join(fromDir, clean));
}

function checkConcept(fm, rel, errors) {
  const type = unquote(fm.fields.type ?? '');
  if (!type) return errors.push(`${rel} has a frontmatter block but no type. Add a non-empty type.`);
  if (unquote(fm.fields.status ?? '') === 'stable' && !allMatches(fm.fields.verified, /\bby:\s*([^,}\s]+)/g).some((b) => b.startsWith('human:'))) {
    errors.push(`${rel} is stable, but no person has verified it. Add a verified entry whose by starts with human:, or set status to draft.`);
  }
}

export function checkBundle(docsDir, now = new Date()) {
  const errors = [];
  const warnings = [];
  const root = path.resolve(docsDir);
  const files = walk(root);
  const rel = (f) => path.relative(root, f).split(path.sep).join('/');
  const concepts = new Set(files.filter((f) => !RESERVED.has(path.basename(f))).map((f) => path.normalize(f)));
  const linkedFrom = (indexFile) =>
    new Set(links(fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : '').map((t) => resolveTarget(root, path.dirname(indexFile), t)));

  for (const file of files) {
    const name = path.basename(file);
    const text = fs.readFileSync(file, 'utf8');
    const fm = readFrontmatter(text);
    if (name === 'index.md') {
      const bad = fm && (file !== path.join(root, 'index.md') || Object.keys(fm.fields).some((k) => k !== 'okf_version'));
      if (bad) errors.push(`${rel(file)} has frontmatter. An index.md may have none, except the root one, which may carry only okf_version.`);
    } else if (name === 'log.md') {
      let dated = false;
      for (const line of text.split(/\r?\n/)) {
        if (/^## /.test(line)) {
          dated = /^## \d{4}-\d{2}-\d{2}\s*$/.test(line);
          if (!dated) errors.push(`${rel(file)} has a date heading "${line.slice(3).trim()}" that is not in YYYY-MM-DD form.`);
        } else if (dated && file === path.join(root, 'log.md') && /^[*-] /.test(line)) {
          if (!links(line).some((t) => concepts.has(resolveTarget(root, root, t)))) {
            warnings.push(`${rel(file)} has an entry that links no concept: ${line.slice(2, 62).trim()}`);
          }
        }
      }
    } else {
      if (!fm) {
        errors.push(`${rel(file)} has no frontmatter block. Add one with at least a type.`);
        continue;
      }
      checkConcept(fm, rel(file), errors);
      if (!linkedFrom(path.join(path.dirname(file), 'index.md')).has(path.normalize(file))) {
        errors.push(`${rel(file)} is not listed in its folder's index.md. Add a link to it.`);
      }
      for (const res of allMatches(fm.fields.sources, /\bresource:\s*(.+)/g)) {
        if ((res.startsWith('/') || res.startsWith('.')) && !fs.existsSync(resolveTarget(root, path.dirname(file), res))) {
          errors.push(`${rel(file)} lists the source ${res}, which does not exist in the bundle.`);
        }
      }
      const stale = unquote(fm.fields.stale_after ?? '');
      if (stale && isNaN(+new Date(stale))) warnings.push(`${rel(file)} has a stale_after date hstack cannot read: ${stale}.`);
      else if (stale && new Date(stale) <= now) warnings.push(`${rel(file)} is past its stale_after date (${stale}). Check it still holds.`);
    }
  }
  return { errors, warnings };
}
