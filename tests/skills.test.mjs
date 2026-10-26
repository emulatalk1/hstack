import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const skill = (name) => fs.readFileSync(new URL(`../skills/${name}/SKILL.md`, import.meta.url), 'utf8');

function checkFrontmatter(name, text) {
  assert.ok(text.startsWith('---\n'), `${name} starts with ---`);
  const front = text.split('\n---')[0];
  assert.match(front, new RegExp(`^name: ${name}$`, 'm'));
  assert.match(front, /^description: \S/m);
}

test('skills have frontmatter and name their scripts', () => {
  const init = skill('hstack-init');
  checkFrontmatter('hstack-init', init);
  assert.match(init, /scripts\/init\.mjs/);

  const safety = skill('hstack-safety');
  checkFrontmatter('hstack-safety', safety);
  for (const check of ['docker', 'port', 'drop', 'wipe']) {
    assert.match(safety, new RegExp(`check\\.mjs <project root> ${check}\\b`), `names the ${check} check`);
  }
  for (const banned of ['docker compose down -v', 'docker volume rm', 'docker volume prune', 'docker system prune --volumes', 'docker rm -v']) {
    assert.ok(safety.includes(banned), `bans ${banned}`);
  }
});
