import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

test('add note writes through IPC and shows the result', async ({}, info) => {
  // E2E_COVERAGE=1 writes this test's V8 coverage to .e2e-coverage/<test>/ (main + window).
  const covDir = process.env.E2E_COVERAGE && resolve('.e2e-coverage', info.titlePath.join(' ').replace(/\W+/g, '-'))
  // E2E_EXECUTABLE runs the electron-builder package instead of the out/ build.
  const exe = process.env.E2E_EXECUTABLE
  const app = await electron.launch({
    ...(exe ? { executablePath: exe, args: [] } : { args: ['.'] }),
    env: {
      ...process.env,
      PROBE_DATA_DIR: mkdtempSync(join(tmpdir(), 'probe-e2e-')),
      ...(covDir && { NODE_V8_COVERAGE: join(covDir, 'main') })
    }
  })
  const page = await app.firstWindow()
  if (covDir) {
    await page.coverage.startJSCoverage({ resetOnNavigation: false })
    await page.reload() // the preload runs before we can attach; reload runs it again under coverage
  }
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved note 1, 1 total')
  if (covDir) {
    mkdirSync(covDir, { recursive: true })
    writeFileSync(join(covDir, 'window.json'), JSON.stringify(await page.coverage.stopJSCoverage()))
  }
  await app.close() // main flushes NODE_V8_COVERAGE on exit
})
