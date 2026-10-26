import fs from 'node:fs';
import path from 'node:path';
import { composeName, projectName } from './identity.mjs';
import { detectStack } from './detect.mjs';
import { findFixedPorts } from './fixed-ports.mjs';

const hasPackage = (dir) => Bun.file(path.join(dir, 'package.json')).exists();

export async function findApp(root, app) {
  if (app) return app;
  if (await hasPackage(root)) return '.';
  const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules');
  const has = await Promise.all(dirs.map((e) => hasPackage(path.join(root, e.name))));
  const found = dirs.filter((_, i) => has[i]).map((e) => e.name);
  if (found.length === 1) return found[0];
  return { error: 'hstack could not tell which folder holds the app. Run with --app <subfolder>.' };
}

function actor() {
  try {
    const r = Bun.spawnSync(['claude', '--version'], { stdout: 'pipe', stderr: 'ignore' });
    if (r.exitCode !== 0) return 'claude-code/unknown';
    return `claude-code/${r.stdout.toString().trim().split(/\s+/)[0]}`;
  } catch {
    return 'claude-code/unknown';
  }
}

async function composeInfo(root, app, stack) {
  if (!stack.compose) return { compose: null, warnings: [] };
  const file = path.posix.join(app, stack.compose);
  const fullPath = path.join(root, file);
  const name = await Bun.file(fullPath).exists() ? await composeName(fullPath) : null;
  const expected = projectName(root);
  const base = path.basename(path.dirname(path.resolve(fullPath))); // Docker's default project name is the compose file's folder
  const warnings = [];
  if (name === null) {
    warnings.push(
      `Warning: The compose file has no project name, so Docker treats this folder as the same project as any other folder named ${base}. hstack will not run \`docker compose\` here until a later hstack step gives it its own services.`,
    );
  } else if (name !== expected) {
    warnings.push(
      `Warning: The compose file names its project ${name}, not ${expected}, so Docker may treat this folder as the same project as any other folder using that name. hstack will not run \`docker compose\` here until a later hstack step gives it its own services.`,
    );
  }
  return { compose: { file, name, matches: name === expected }, warnings };
}

export async function buildManifest(root, app) {
  const found = await findApp(root, app);
  if (typeof found === 'object') return found;
  const appDir = path.join(root, found);
  const stack = await detectStack(appDir);
  if (!stack) {
    return { error: 'hstack found no stack it knows here (stack A: Next.js + Payload with pnpm; stack B: Electron + electron-vite with npm). Nothing was written.' };
  }
  const { compose, warnings } = await composeInfo(root, found, stack);
  const portWarnings = (await findFixedPorts(appDir)).map(
    (h) => `Warning: ${h.file} line ${h.line} has port ${h.port} written in code. Read ports from .env so this project can get its own.`,
  );
  return {
    manifest: {
      version: 1,
      projectName: projectName(root),
      app: found,
      stack: stack.stack,
      packageManager: stack.packageManager,
      commands: stack.commands,
      devServer: stack.devServer,
      data: stack.data,
      compose,
      paths: {
        design: 'docs/design/',
        plans: 'docs/plans/',
        features: 'progress/features.json',
        coverage: 'progress/test-coverage.md',
        progressLog: 'progress/progress.md',
        evaluations: 'progress/evaluations/',
      },
      actor: actor(),
      slots: {
        spec: 'superpowers:brainstorming',
        plan: 'superpowers:writing-plans',
        build: 'superpowers:subagent-driven-development',
        review: 'superpowers:requesting-code-review',
        audit: 'ponytail:ponytail-audit',
        finish: 'superpowers:finishing-a-development-branch',
      },
      evaluators: { models: ['opus', 'sonnet'] },
      mutation: { budgetMinutes: 20 },
    },
    warnings: [...warnings, ...portWarnings],
  };
}
