// Opt-in live verification. Requires a provisioned manager's credentials in
// TOPH_DEMO_EMAIL / TOPH_DEMO_PASSWORD; never writes or prints those values.
// Uses only the public key and RLS. Attaches the existing Needs Review tag,
// then removes only the assignments this run created. No schema/admin changes.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const email = process.env.TOPH_DEMO_EMAIL;
const password = process.env.TOPH_DEMO_PASSWORD;
if (!email || !password) throw new Error('Set TOPH_DEMO_EMAIL and TOPH_DEMO_PASSWORD for this opt-in check.');
const base = process.env.TOPH_DEMO_BASE_URL ?? 'http://localhost:3000';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const isaac = '20000000-0000-4000-8000-000000000001';
const maya = '20000000-0000-4000-8000-000000000002';
let browser;
let farmId;
let tagId;
const cleanup = new Set();
async function login(page) {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${base}/`, { timeout: 30000 });
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await page.mouse.move(0, 0);
}
async function assignments() {
  const result = await supabase.from('activity_log_tags').select('id, activity_log_id').eq('farm_id', farmId).eq('tag_id', tagId);
  if (result.error) throw new Error('Assignment verification failed.');
  return result.data;
}
async function waitTag(page) {
  try { await page.getByRole('button', { name: 'Remove Needs Review tag' }).waitFor({ timeout: 60000 }); }
  catch {
    console.log(JSON.stringify({ page: page.url(), headings: await page.locator('h1').allTextContents(), notices: await page.locator('.empty-state').allTextContents(), details: await page.locator('.log-details').count(), tags: await page.locator('.tag-list').allTextContents(), form: await page.locator('.tag-form').allTextContents() }));
    const message = await page.locator('.form-error').first().textContent({ timeout: 1000 }).catch(() => 'No tag error message was rendered.');
    throw new Error(`Tag verification failed: ${message}`);
  }
}
try {
  const auth = await supabase.auth.signInWithPassword({ email, password });
  if (auth.error) throw new Error('Demo login failed.');
  const profile = await supabase.from('profiles').select('farm_id, role').eq('id', auth.data.user.id).single();
  assert.ok(!profile.error && ['admin', 'manager'].includes(profile.data?.role), 'Expected manager farm membership.');
  farmId = profile.data.farm_id;
  const tag = await supabase.from('tags').select('id').eq('farm_id', farmId).eq('name', 'Needs Review').single();
  assert.ok(!tag.error && tag.data, 'Expected seeded Needs Review definition.');
  tagId = tag.data.id;
  const initial = await assignments();
  if (initial.some((row) => [isaac, maya].includes(row.activity_log_id))) throw new Error('Live check stopped: target logs already have Needs Review; their assignments were preserved.');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1676, height: 955 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.name));
  await login(page);
  assert.deepEqual(await page.locator('.metric-card dd').allTextContents(), ['51 New', '12', '90']);
  assert.equal(await page.locator('.log-row').count(), 4);
  console.log('PASS: signed-in dashboard loaded the expected database metrics and four logs.');
  await mkdir('docs/qa/database', { recursive: true });
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'docs/qa/database/default.png', fullPage: true });
  await page.getByRole('button', { name: "View Isaac Wang's log" }).click();
  await page.waitForLoadState('networkidle');
  // Network-idle alone can precede painting newly expanded CSS backgrounds.
  await page.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('.log-details img')].map((image) => image.decode()));
    for (const asset of ['imgFrame122.png', 'imgFrame121.png', 'imgGroup1.svg', 'imgEllipse12.svg']) {
      const image = new Image();
      image.src = `/design/figma/${asset}`;
      await image.decode();
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: 'docs/qa/database/expanded.png', fullPage: true });
  for (const [name, id] of [['Isaac Wang', isaac], ['Maya Patel', maya]]) {
    if (name !== 'Isaac Wang') await page.getByRole('button', { name: `View ${name}'s log` }).click();
    cleanup.add(id);
    await page.getByRole('button', { name: 'Add Tag', exact: true }).click();
    await page.getByLabel('Tag name').fill(name === 'Isaac Wang' ? 'Needs Review' : 'needs review');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await waitTag(page);
  }
  assert.equal((await assignments()).filter((row) => [isaac, maya].includes(row.activity_log_id)).length, 2);
  console.log('PASS: real database load, expected metrics, reusable tag saved on two logs.');
  await page.reload();
  await page.getByRole('button', { name: "View Isaac Wang's log" }).click();
  await waitTag(page);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tag', exact: true }).selectOption('needs review');
  await page.waitForFunction(() => document.querySelectorAll('.log-row').length === 2);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  console.log('PASS: refresh retained tags and Needs Review filter found both logs.');
  const second = await browser.newContext({ viewport: { width: 1676, height: 955 } });
  const other = await second.newPage();
  await login(other);
  await other.getByRole('button', { name: "View Isaac Wang's log" }).click();
  await waitTag(other);
  await other.getByRole('button', { name: 'Log Out', exact: true }).click();
  await other.waitForURL(`${base}/login`);
  await second.close();
  console.log('PASS: saved tag visible in an independent signed-in browser session.');
  await page.getByRole('button', { name: 'Remove Needs Review tag' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.log-row').length === 1);
  await page.reload();
  await page.getByRole('button', { name: "View Isaac Wang's log" }).click();
  assert.equal(await page.getByRole('list', { name: 'Log tags' }).count(), 0);
  await page.getByRole('button', { name: "View Maya Patel's log" }).click();
  await waitTag(page);
  await page.getByRole('button', { name: 'Remove Needs Review tag' }).click();
  await page.getByRole('list', { name: 'Log tags' }).waitFor({ state: 'detached' });
  assert.equal((await assignments()).filter((row) => [isaac, maya].includes(row.activity_log_id)).length, 0);
  assert.equal(errors.length, 0, 'Unexpected browser errors.');
  await page.getByRole('button', { name: 'Log Out', exact: true }).click();
  await page.waitForURL(`${base}/login`);
  console.log('PASS: detaching one log preserves the other; test assignments removed; logout works.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const id of cleanup) {
    const result = await supabase.from('activity_log_tags').delete().eq('farm_id', farmId).eq('activity_log_id', id).eq('tag_id', tagId);
    if (result.error) { console.error('Could not clean up a live verification assignment.'); process.exitCode = 1; }
  }
  await browser?.close();
  await supabase.auth.signOut({ scope: 'local' });
}
