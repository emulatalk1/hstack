#!/usr/bin/env bun
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildManifest } from './lib/manifest.mjs';
import { exists, isDir } from './lib/fsutil.mjs';
import { checkBundle } from './lib/okf.mjs';

const USAGE = 'Usage: bun scripts/init.mjs [root] [--app <subfolder>] [--force]';

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
if (!isDir(root)) fail(`${root} is not a folder. Nothing was written.`);
const file = path.join(root, '.hstack', 'manifest.json');
if (exists(file) && !args.values.force) {
  fail(`A manifest already exists at ${file}; nothing changed. Run with --force to replace it.`);
}
const result = await buildManifest(root, args.values.app);
if (result.error) fail(result.error);

await Bun.write(file, JSON.stringify(result.manifest, null, 2) + '\n');
for (const w of result.warnings) console.log(w);
console.log(`Wrote ${file}`);

const docs = path.join(root, 'docs');
if (isDir(docs)) {
  const { errors, warnings } = await checkBundle(docs);
  console.log(errors.length ? `Docs bundle: ${errors.length} errors.` : 'Docs bundle: OK');
  for (const e of errors.slice(0, 3)) console.log(`  ${e}`);
  if (warnings.length) console.log(`Docs bundle: ${warnings.length} stale or unlinked items. Run bun scripts/okf-check.mjs docs to see them.`);
}
