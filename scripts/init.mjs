#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildManifest } from './lib/manifest.mjs';

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
const result = buildManifest(root, args.values.app);
if (result.error) fail(result.error);

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(result.manifest, null, 2) + '\n');
for (const w of result.warnings) console.log(w);
console.log(`Wrote ${file}`);
