import path from 'node:path';

const read = async (dir, file) => {
  try {
    return await Bun.file(path.join(dir, file)).text();
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

async function stackA(dir) {
  const env = parseEnv(await read(dir, '.env'));
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
    compose: await Bun.file(path.join(dir, 'docker-compose.yml')).exists() ? 'docker-compose.yml' : null,
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

export async function detectStack(appDir) {
  let pkg;
  try {
    pkg = JSON.parse(await read(appDir, 'package.json'));
  } catch {
    return null;
  }
  const has = (name) => name in { ...pkg?.dependencies, ...pkg?.devDependencies };
  const exists = (file) => Bun.file(path.join(appDir, file)).exists();
  if (has('next') && has('payload') && await exists('pnpm-lock.yaml')) return stackA(appDir);
  if ('electron-vite' in (pkg?.devDependencies ?? {}) && await exists('package-lock.json')) return stackB(pkg);
  return null;
}
