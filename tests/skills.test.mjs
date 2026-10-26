import { test, expect } from 'bun:test';

const skill = (name) => Bun.file(new URL(`../skills/${name}/SKILL.md`, import.meta.url)).text();

function checkFrontmatter(name, text) {
  expect(text.startsWith('---\n')).toBeTruthy();
  const front = text.split('\n---')[0];
  expect(front).toMatch(new RegExp(`^name: ${name}$`, 'm'));
  expect(front).toMatch(/^description: \S/m);
}

test('skills have frontmatter and name their scripts', async () => {
  const init = await skill('hstack-init');
  checkFrontmatter('hstack-init', init);
  expect(init).toMatch(/scripts\/init\.mjs/);

  const safety = await skill('hstack-safety');
  checkFrontmatter('hstack-safety', safety);
  for (const check of ['docker', 'port', 'drop', 'wipe']) {
    expect(safety).toMatch(new RegExp(`check\\.mjs <project root> ${check}\\b`));
  }
  for (const banned of ['docker compose down -v', 'docker volume rm', 'docker volume prune', 'docker system prune --volumes', 'docker rm -v']) {
    expect(safety.includes(banned)).toBeTruthy();
  }
  for (const allowed of ['docker compose up -d', 'docker compose stop', 'docker compose down', 'com.docker.compose.project.working_dir', 'COMPOSE_PROJECT_NAME']) {
    expect(safety.includes(allowed)).toBeTruthy();
  }
});
