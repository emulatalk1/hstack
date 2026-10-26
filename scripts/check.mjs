#!/usr/bin/env bun
// Answers "may I do this?" for an agent. Exit 0 = allowed, 1 = refused. It never performs the action.
import fs from 'node:fs';
import path from 'node:path';
import { exists } from './lib/fsutil.mjs';
import { composeName, projectName } from './lib/identity.mjs';
import { isOurs, portOwners } from './lib/ports.mjs';

const USAGE = 'Usage: bun scripts/check.mjs <project-folder> docker | port <number> | drop <database> | wipe <folder>';

function say(code, message) {
  console.log(message);
  process.exit(code);
}
const refuse = (message) => say(1, message);
const allow = (message) => say(0, message);

// Real path; for a folder that does not exist yet, the real path of its nearest existing parent plus the rest.
function real(p) {
  const full = path.resolve(p);
  try {
    return fs.realpathSync(full);
  } catch {
    const parent = path.dirname(full);
    return parent === full ? full : path.join(real(parent), path.basename(full));
  }
}

const inside = (child, parent) => child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);

async function devScriptValue(appDir, name) {
  try {
    const dev = (await Bun.file(path.join(appDir, 'package.json')).json()).scripts?.dev ?? '';
    const m = dev.match(new RegExp(`(?:^|[\\s;&])${name}=("[^"]*"|'[^']*'|[^\\s;&]+)`));
    return m ? m[1].replace(/^(["'])(.*)\1$/, '$2') : null;
  } catch {
    return null;
  }
}

const DEFAULT_COMPOSE_FILES = ['compose.yaml', 'compose.yml', 'docker-compose.yaml', 'docker-compose.yml'];

// Compose lets these variables (in the shell or in the .env beside the compose file) override the name and the file.
async function composeOverride(file) {
  let env = '';
  try {
    env = await Bun.file(path.join(path.dirname(file), '.env')).text();
  } catch {
    // No .env file: only the shell can set them.
  }
  return ['COMPOSE_PROJECT_NAME', 'COMPOSE_FILE'].find((v) => process.env[v] || new RegExp(`^\\s*(export\\s+)?${v}\\s*=`, 'm').test(env));
}

// Refusing because something exists: a folder of that name counts too (Bun.file().exists() is false for folders).
async function findOtherComposeFile(file) {
  for (const f of DEFAULT_COMPOSE_FILES) {
    const p = path.join(path.dirname(file), f);
    if (f !== path.basename(file) && exists(p)) return f;
  }
  return undefined;
}

async function checkDocker(dir, manifest) {
  const { compose } = manifest;
  if (!compose) refuse('This project has no compose file, so hstack will not allow Docker commands here.');
  const file = path.resolve(dir, compose.file);
  if (!(await Bun.file(file).exists())) refuse(`The compose file ${compose.file} is missing, so hstack will not allow Docker commands here.`);
  const override = await composeOverride(file);
  if (override) refuse(`${override} is set (in the shell or in the .env beside the compose file), so Docker could use another project name or file than the one hstack checked. Docker is not allowed here.`);
  const other = await findOtherComposeFile(file);
  if (other) refuse(`${other} sits beside ${compose.file}, and Docker might pick it instead. Docker is not allowed here.`);
  const name = await composeName(file);
  if (name === null) refuse(`The compose file ${compose.file} has no project name, so Docker would share it with other folders of the same name. Docker is not allowed here.`);
  if (name !== projectName(dir)) refuse(`The compose file names its project ${name}, not ${projectName(dir)}, so Docker would share it with other folders. Docker is not allowed here.`);
  allow(`Docker is allowed: the compose project is ${name}.`);
}

async function checkPort(dir, manifest, port) {
  let owners;
  try {
    owners = await portOwners(port);
  } catch (err) {
    refuse(`${err.message}. A port that cannot be checked is never allowed.`);
  }
  if (!owners.length) allow(`Port ${port} is free.`);
  const owner = owners.find((o) => !isOurs(o, dir, manifest.projectName));
  if (!owner) allow(`Port ${port} is held by this project.`);
  const who = owner.kind === 'container'
    ? `the Docker container ${owner.name} (Docker project ${owner.project ?? 'unknown'})`
    : `a process (pid ${owner.pid}) running from ${owner.cwd ?? 'a folder hstack could not read'}`;
  refuse(`Port ${port} is held by ${who}, not by this project. hstack will not stop it.`);
}

function checkDrop(manifest, name) {
  if (manifest.data.kind !== 'postgres') refuse('This project keeps its data in a folder, not a database, so hstack will not drop anything here. Use wipe for the data folder.');
  if (manifest.data.droppable.includes(name)) allow(`Dropping ${name} is allowed.`);
  refuse(`${name} is not on this project's list of data hstack may drop. It may drop only: ${manifest.data.droppable.join(', ') || 'nothing'}.`);
}

// Fixed system temp folders; TMPDIR is never trusted, or a caller could declare any folder "temp".
function systemTempFolders() {
  const folders = [real('/tmp')];
  if (process.platform === 'darwin') {
    try {
      const { exitCode, stdout } = Bun.spawnSync(['getconf', 'DARWIN_USER_TEMP_DIR']);
      const temp = stdout.toString().trim();
      if (exitCode === 0 && temp) folders.push(real(temp));
    } catch {
      // No user temp folder to add (getconf missing).
    }
  }
  return folders;
}

async function checkWipe(dir, manifest, target) {
  if (manifest.data.kind !== 'folder') refuse('This project keeps its data in a database, so hstack will not wipe folders here. Drop the database instead.');
  const appDir = path.resolve(dir, manifest.app);
  const root = real(dir);
  const temps = systemTempFolders();
  const never = [root, real(appDir), ...temps];
  const hstackDir = path.join(root, '.hstack');
  const allowed = [];
  for (const entry of manifest.data.droppable) {
    if (!entry.startsWith('$')) continue;
    const name = entry.slice(1);
    const fromScript = await devScriptValue(appDir, name);
    const scriptPath = fromScript && real(path.resolve(appDir, fromScript));
    if (scriptPath && inside(scriptPath, root)) allowed.push(scriptPath);
    // An env value counts only inside a system temp folder, and never inside this project (its own data comes from the dev script).
    if (process.env[name]) {
      const fromEnv = real(path.resolve(appDir, process.env[name]));
      if (temps.some((t) => inside(fromEnv, t)) && !inside(fromEnv, root)) allowed.push(fromEnv);
    }
  }
  const holdsProject = (p) => inside(root, p) || inside(real(appDir), p);
  const ok = allowed.filter((p) => !never.includes(p) && !holdsProject(p) && !inside(p, hstackDir) && p !== hstackDir);
  if (!ok.length) refuse('hstack could not work out a safe data folder for this project, so it will not wipe anything.');
  const wanted = real(target);
  if (ok.includes(wanted)) allow(`Wiping ${wanted} is allowed.`);
  refuse(`hstack may wipe only ${ok.join(' or ')}. ${wanted} is not allowed.`);
}

const [dirArg, check, arg] = process.argv.slice(2);
const needsArg = { port: true, drop: true, wipe: true, docker: false };
if (!dirArg || !Object.hasOwn(needsArg, check) || (needsArg[check] && !arg) || (check === 'port' && !(/^\d{1,5}$/.test(arg) && arg >= 1 && arg <= 65535))) say(1, USAGE);

const dir = path.resolve(dirArg);
const file = path.join(dir, '.hstack', 'manifest.json');
if (!(await Bun.file(file).exists())) refuse('No hstack manifest here. Run init first.');
const unreadable = () => refuse(`The hstack manifest at ${file} could not be read. Run init again with --force.`);
let manifest;
try {
  manifest = await Bun.file(file).json();
} catch {
  unreadable();
}
if (typeof manifest?.projectName !== 'string' || !Array.isArray(manifest.data?.droppable)) unreadable();
if (projectName(dir) !== manifest.projectName) {
  refuse(`This folder was copied or moved since init (its manifest is for ${manifest.projectName}, but this folder is ${projectName(dir)}). Run init again here.`);
}

if (check === 'docker') await checkDocker(dir, manifest);
else if (check === 'port') await checkPort(dir, manifest, Number(arg));
else if (check === 'drop') checkDrop(manifest, arg);
else await checkWipe(dir, manifest, arg);
