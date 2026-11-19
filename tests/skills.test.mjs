import { test, expect } from 'bun:test';

const skill = (name) => Bun.file(new URL(`../skills/${name}/SKILL.md`, import.meta.url)).text();

function checkFrontmatter(name, text) {
  expect(text.startsWith('---\n')).toBeTruthy();
  const front = text.split('\n---')[0];
  expect(front).toMatch(new RegExp(`^name: ${name}$`, 'm'));
  expect(front).toMatch(/^description: \S/m);
  expect(front).toMatch(/^compatibility: Requires Bun 1\.4\.4 or later$/m);
  expect(text).not.toMatch(/node /);
}

test('hstack-feedback is user-invoked, runs on sh and passes its text through a quoted heredoc', async () => {
  const text = await skill('hstack-feedback');
  const front = text.split('\n---')[0];
  expect(front).toMatch(/^name: hstack-feedback$/m);
  expect(front).toMatch(/^description: \S/m);
  expect(front).toMatch(/^disable-model-invocation: true$/m);
  expect(front).not.toMatch(/Bun/);
  for (const verb of ["add <kind> <phase> <<'HSTACK_FEEDBACK_TEXT'", "describe <id> <<'HSTACK_FEEDBACK_TEXT'", 'draft', 'post <id> <code>', 'dismiss <id>', 'label', 'collect']) expect(text.includes(`$H feedback ${verb}`)).toBeTruthy();
  expect(text).toMatch(/sh "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hstack\.sh"/);
  const { version } = await Bun.file(new URL('../.claude-plugin/plugin.json', import.meta.url)).json();
  expect(await Bun.file(new URL('../README.md', import.meta.url)).text()).toContain(`**Status: v${version}.**`);
});

test('skills have frontmatter and name their scripts', async () => {
  const init = await skill('hstack-init');
  checkFrontmatter('hstack-init', init);
  expect(init).toMatch(/bun "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/init\.mjs"/);

  const safety = await skill('hstack-safety');
  checkFrontmatter('hstack-safety', safety);
  for (const check of ['docker', 'port', 'drop', 'wipe']) {
    expect(safety).toMatch(new RegExp(`bun "\\$\\{CLAUDE_PLUGIN_ROOT\\}\\/scripts\\/check\\.mjs" <project root> ${check}\\b`));
  }
  for (const banned of ['docker compose down -v', 'docker volume rm', 'docker volume prune', 'docker system prune --volumes', 'docker rm -v']) {
    expect(safety.includes(banned)).toBeTruthy();
  }
  for (const allowed of ['docker compose up -d', 'docker compose stop', 'docker compose down', 'com.docker.compose.project.working_dir', 'COMPOSE_PROJECT_NAME', '--env-file', '--project-directory']) {
    expect(safety.includes(allowed)).toBeTruthy();
  }
});
