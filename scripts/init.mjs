#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildManifest } from './lib/manifest.mjs';
import { checkBundle } from './lib/okf.mjs';

const USAGE = 'Usage: node scripts/init.mjs [root] [--app <subfolder>] [--force]';

function fail(message) {
  console.log(message);
  process.exit(1);
}

let args;
try {
  args = parseArgs({ allowPositionals: true, options: { app: { type: 'string' }, force: { type: 'boolean' } } });
} catch {
  fail(USAGE);
}
if (args.positionals.length > 1) fail(USAGE);

const root = path.resolve(args.positionals[0] ?? '.');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail(`${root} is not a folder. Nothing was written.`);
const file = path.join(root, '.hstack', 'manifest.json');
if (fs.existsSync(file) && !args.values.force) {
  fail(`A manifest already exists at ${file}; nothing changed. Run with --force to replace it.`);
}
const result = await buildManifest(root, args.values.app);
if (result.error) fail(result.error);

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(result.manifest, null, 2) + '\n');
for (const w of result.warnings) console.log(w);
console.log(`Wrote ${file}`);

const docs = path.join(root, 'docs');
if (fs.existsSync(docs) && fs.statSync(docs).isDirectory()) {
  const { errors, warnings } = checkBundle(docs);
  console.log(errors.length ? `Docs bundle: ${errors.length} errors.` : 'Docs bundle: OK');
  for (const e of errors.slice(0, 3)) console.log(`  ${e}`);
  if (warnings.length) console.log(`Docs bundle: ${warnings.length} stale or unlinked items. Run node scripts/okf-check.mjs docs to see them.`);
}
