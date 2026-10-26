#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { checkBundle } from './lib/okf.mjs';

const dir = process.argv[2];
if (!dir) {
  console.log('Usage: node scripts/okf-check.mjs <docs folder>');
  process.exit(1);
}
if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
  console.log(`${path.resolve(dir)} is not a folder, so there is no docs bundle to check.`);
  process.exit(1);
}
const { errors, warnings } = await checkBundle(dir);
for (const e of errors) console.log(`Error: ${e}`);
for (const w of warnings) console.log(`Warning: ${w}`);
console.log(errors.length ? `Docs bundle: ${errors.length} errors.` : 'Docs bundle: OK');
process.exit(errors.length ? 1 : 0);
