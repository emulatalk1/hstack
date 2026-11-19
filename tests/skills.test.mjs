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

const rule = (name) => Bun.file(new URL(`../skills/build-implement/${name}`, import.meta.url)).text();

test("the builder's test rules: no ask of a human, no upstream name, the licence beside them", async () => {
  const [tdd, good, licence] = await Promise.all([rule('tdd.md'), rule('writing-good-tests.md'), rule('LICENSE-tdd')]);
  for (const s of ['NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST', '## In hstack', '$S/capabilities.md', '](writing-good-tests.md)']) expect(tdd).toContain(s);
  // what the loop does on purpose and the copied rules would call a violation: each has its item
  for (const s of ["**The oracle's tests**", '**A guard.**', '**A mutant-killing test**', '**An empty interface.**', '**What the base already had.**', '**A fix no test can show.**', '$S/summary.md', 'Seven things are not violations']) expect(tdd).toContain(s);
  // a guard is for what the base already did, never for what this run's own code does
  for (const s of ['that the code at the base already handles', 'is not a guard; the next item is for its test', "**A test that passes at once on this run's own code.**", 'break the part of your code the edge rests on', 'undo that one edit by hand', 'never restore the file with `git checkout`', 'the test is a guard', 'make it check the edge, or drop it']) expect(tdd).toContain(s);
  // the edits of the copy, each by its new text; the text they replace is gone
  for (const s of ['write the decision in `$S/decisions.md`):**', 'A guard, or a test you then prove by breaking the code (see "In hstack"), stays', 'Only in code this run added', 'and is neither a guard nor proven by breaking the code', 'No exceptions but the ones this file names.']) expect(tdd).toContain(s);
  expect(tdd.split('No error or warning the base did not have').length).toBe(3);
  expect(tdd).not.toMatch(/Output pristine|Fix test\.$/m);
  expect(tdd).not.toMatch(/ask your human partner|human partner's permission|superpowers/i);
  expect(tdd.startsWith('# Test-Driven Development')).toBeTruthy(); // a file of a skill, not a skill: no frontmatter
  expect(good).not.toMatch(/superpowers/i);
  for (const s of ['tdd.md', 'writing-good-tests.md', 'Permission is hereby granted', 'Copyright (c)']) expect(licence).toContain(s);
});

test('hstack:build-implement is step 4: the loop can invoke it, and it sends anyone else to the loop', async () => {
  const text = await skill('build-implement');
  const front = text.split('\n---')[0];
  expect(front).toMatch(/^name: build-implement$/m);
  expect(front).toMatch(/^description: .*invoke hstack:build, not this\.$/m);
  expect(front).not.toMatch(/disable-model-invocation/); // the playbook must be able to trigger it
  // the cycle is one test at a time, and a change after green starts a new one: the first run did neither
  for (const s of ['one decided edge or rule per cycle', 'Only then write the next test', 'is a new cycle and starts with a test that fails', "the cycle's refactor step changes none of these", 'A next test that passes at once', 'break that code, see the test fail, undo that one edit by hand']) expect(text).toContain(s);
  for (const s of ['do nothing here and invoke `hstack:build`', 'its first word must be `implement`', 'never run `$H start` again', 'tdd.md', 'writing-good-tests.md', '$S/spec.md', 'without editing them', 'type-check']) expect(text).toContain(s);
});

test('build is a playbook: step 4 invokes hstack:build-implement', async () => {
  const loop = await skill('build');
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) expect(loop).toMatch(new RegExp(`^## ${n}\\. `, 'm'));
  expect(loop.split('\n---')[0]).toContain('written before the code, the implementation, a gate');
  expect(loop).toMatch(/^## 4\. Implement$/m);
  expect(loop).toContain('Invoke the `hstack:build-implement` skill');
  expect(loop).toContain('$H phase implement');
  expect(loop).not.toContain('$H phase build');
  expect(await skill('hstack-feedback')).toContain('`setup`, `oracle`, `implement`, `gate`');
  expect(loop).toContain('(or dispute it, step 4)');
  expect(loop).toContain('**Dispute** (at most 2 rounds)');
  expect(loop).toContain('a fix gets a test that fails first, but a lint, format or type fix'); // step 9 agrees with the test rules
  expect(loop).not.toContain('numbered behaviours'); // the how of step 4 lives in hstack:build-implement
});
