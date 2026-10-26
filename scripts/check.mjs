#!/usr/bin/env node
// Answers "may I do this?" for an agent. Exit 0 = allowed, 1 = refused. It never performs the action.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { composeName, projectName } from './lib/identity.mjs';
import { isOurs, portOwner } from './lib/ports.mjs';

const USAGE = 'Usage: node scripts/check.mjs <project-folder> docker | port <number> | drop <database> | wipe <folder>';

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

function devScriptValue(appDir, name) {
  try {
    const dev = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).scripts?.dev ?? '';
    const m = dev.match(new RegExp(`(?:^|[\\s;&])${name}=("[^"]*"|'[^']*'|[^\\s;&]+)`));
    return m ? m[1].replace(/^(["'])(.*)\1$/, '$2') : null;
  } catch {
    return null;
  }
}

function checkDocker(dir, manifest) {
  const { compose } = manifest;
  if (!compose) refuse('This project has no compose file, so hstack will not allow Docker commands here.');
  const file = path.resolve(dir, compose.file);
  if (!fs.existsSync(file)) refuse(`The compose file ${compose.file} is missing, so hstack will not allow Docker commands here.`);
  const name = composeName(file);
  if (name === null) refuse(`The compose file ${compose.file} has no project name, so Docker would share it with other folders of the same name. Docker is not allowed here.`);
  if (name !== projectName(dir)) refuse(`The compose file names its project ${name}, not ${projectName(dir)}, so Docker would share it with other folders. Docker is not allowed here.`);
  allow(`Docker is allowed: the compose project is ${name}.`);
}

async function checkPort(dir, manifest, port) {
  let owner;
  try {
    owner = await portOwner(port);
  } catch (err) {
    refuse(`${err.message}. A port that cannot be checked is never allowed.`);
  }
  if (owner === null) allow(`Port ${port} is free.`);
  if (isOurs(owner, dir, manifest.projectName)) allow(`Port ${port} is held by this project.`);
  const who = owner.kind === 'container'
    ? `the Docker container ${owner.name} (Docker project ${owner.project ?? 'unknown'})`
    : `a process (pid ${owner.pid}) running from ${owner.cwd ?? 'a folder hstack could not read'}`;
  refuse(`Port ${port} is held by ${who}, not by this project. hstack will not stop it.`);
}

function checkDrop(manifest, name) {
  if (manifest.data.droppable.includes(name)) allow(`Dropping ${name} is allowed.`);
  refuse(`${name} is not on this project's list of data hstack may drop. It may drop only: ${manifest.data.droppable.join(', ') || 'nothing'}.`);
}

function checkWipe(dir, manifest, target) {
  if (manifest.data.kind !== 'folder') refuse('This project keeps its data in a database, so hstack will not wipe folders here. Drop the database instead.');
  const appDir = path.resolve(dir, manifest.app);
  const allowed = [];
  for (const entry of manifest.data.droppable) {
    if (!entry.startsWith('$')) continue;
    const name = entry.slice(1);
    const value = process.env[name] ?? devScriptValue(appDir, name);
    if (value) allowed.push(real(path.resolve(appDir, value)));
  }
  if (!allowed.length) refuse('hstack could not work out which data folder this project uses, so it will not wipe anything.');
  const wanted = real(target);
  const roots = [real(dir), real(os.tmpdir())];
  const never = [...roots, real(appDir)];
  if (allowed.includes(wanted) && !never.includes(wanted) && roots.some((r) => inside(wanted, r))) {
    allow(`Wiping ${wanted} is allowed.`);
  }
  refuse(`hstack may wipe only ${allowed.join(' or ')}, and only inside the project folder or the temp folder. ${wanted} is not allowed.`);
}

const [dirArg, check, arg] = process.argv.slice(2);
const needsArg = { port: true, drop: true, wipe: true, docker: false };
if (!dirArg || !Object.hasOwn(needsArg, check) || (needsArg[check] && !arg) || (check === 'port' && !/^\d{1,5}$/.test(arg))) say(1, USAGE);

const dir = path.resolve(dirArg);
const file = path.join(dir, '.hstack', 'manifest.json');
if (!fs.existsSync(file)) refuse('No hstack manifest here. Run init first.');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
if (projectName(dir) !== manifest.projectName) {
  refuse(`This folder was copied or moved since init (its manifest is for ${manifest.projectName}, but this folder is ${projectName(dir)}). Run init again here.`);
}

if (check === 'docker') checkDocker(dir, manifest);
else if (check === 'port') await checkPort(dir, manifest, Number(arg));
else if (check === 'drop') checkDrop(manifest, arg);
else checkWipe(dir, manifest, arg);
