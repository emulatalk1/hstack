import fs from 'node:fs';
import path from 'node:path';

const read = (dir, file) => {
  try {
    return fs.readFileSync(path.join(dir, file), 'utf8');
  } catch {
    return null;
  }
};

function parseEnv(text) {
  const env = {};
  for (const line of (text ?? '').split('\n')) {
    const m = line.trim().match(/^([^#=\s][^=]*?)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return env;
}

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

function stackA(dir) {
  const env = parseEnv(read(dir, '.env'));
  const port = Number(parseUrl(env.NEXT_PUBLIC_SERVER_URL)?.port) || 3000;
  const dbName = parseUrl(env.DATABASE_URL)?.pathname.slice(1);
  return {
    stack: 'A',
    packageManager: 'pnpm',
    commands: {
      install: 'pnpm install --frozen-lockfile',
      unit: 'pnpm test --project unit',
      int: 'pnpm test --project int',
      e2e: 'pnpm test:e2e --project chromium',
      oneTest: {
        unit: "pnpm test --project unit -t '<title>'",
        int: "pnpm test --project int -t '<title>'",
        e2e: "pnpm test:e2e --project chromium -g '<title>'",
      },
    },
    devServer: { start: 'pnpm dev', port },
    data: {
      kind: 'postgres',
      droppable: dbName ? [dbName, `${dbName}_test`] : [],
      seed: 'pnpm seed:demo',
    },
    compose: fs.existsSync(path.join(dir, 'docker-compose.yml')) ? 'docker-compose.yml' : null,
  };
}

function stackB(pkg) {
  const dirVars = [...(pkg.scripts?.dev ?? '').matchAll(/(?:^|\s)(\w*_DATA_DIR)=/g)];
  return {
    stack: 'B',
    packageManager: 'npm',
    commands: {
      install: 'npm ci',
      unit: 'npm test',
      int: 'npm test',
      e2e: 'npm run test:e2e',
      oneTest: {
        unit: "npx vitest run -t '<title>'",
        int: "npx vitest run -t '<title>'",
        e2e: "npx playwright test -g '<title>'",
      },
    },
    devServer: { start: 'npm run dev', port: null },
    data: { kind: 'folder', droppable: dirVars.map((m) => `$${m[1]}`), seed: null },
    compose: null,
  };
}

export function detectStack(appDir) {
  let pkg;
  try {
    pkg = JSON.parse(read(appDir, 'package.json'));
  } catch {
    return null;
  }
  const has = (name) => name in { ...pkg?.dependencies, ...pkg?.devDependencies };
  const exists = (file) => fs.existsSync(path.join(appDir, file));
  if (has('next') && has('payload') && exists('pnpm-lock.yaml')) return stackA(appDir);
  if ('electron-vite' in (pkg?.devDependencies ?? {}) && exists('package-lock.json')) return stackB(pkg);
  return null;
}
