import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import cells from '../src/data/questions/life/cells.json' with { type: 'json' };
import type { Question } from '../src/core/types';
async function ready(page: Page) { await page.goto('/'); await expect(page.getByRole('heading', { name: 'Hey, curious mind!' })).toBeVisible(); }
test('phase 1: Cells vertical slice, mastery and Review Box', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await ready(page); await page.goto('/#/branch/life'); await page.getByRole('button', { name: 'Open Cells', exact: true }).click(); await page.getByRole('button', { name: 'Let’s make a discovery' }).click();
  for (let i = 0; i < 8; i++) {
    await expect(page.getByRole('button', { name: 'Check my answer' })).toBeVisible();
    const prompt = await page.locator('.question-card > h2').innerText(), q = (cells as Question[]).find(q => q.prompt === prompt)!;
    expect(q).toBeTruthy();
    if (q.type === 'order') { /* intentionally keep the shuffled order: mix-ups are part of this smoke test */ }
    else if (q.type === 'match' && typeof q.answer === 'object') { for (const [key, value] of Object.entries(q.answer)) await page.getByRole('combobox', { name: `Match ${key}` }).selectOption(value); }
    else if (q.options) { const choice = i === 0 ? q.options.find(o => o.id !== q.answer)! : q.options.find(o => o.id === q.answer)!; await page.getByRole('button', { name: choice.text, exact: false }).click(); }
    else await page.getByLabel('Your answer', { exact: true }).fill(String(q.answer));
    await page.getByRole('button', { name: 'Check my answer' }).click(); await expect(page.locator('.answer-feedback')).toBeVisible();
    await page.getByRole('button', { name: i === 7 ? 'See my discoveries' : 'On to the next little wonder' }).click();
  }
  await expect(page.getByRole('heading', { name: /discovered|perfect little/ })).toBeVisible(); await page.getByRole('button', { name: 'Visit my Review Box' }).click(); await expect(page.getByRole('heading', { name: 'Your Review Box', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('csl:state')!).users.find((u: { id: string }) => u.id === 'guest').mastery['life.cells'].completed)).toBe(1); expect(errors).toEqual([]);
});
test('dashboard has no serious accessibility errors and fits a phone', async ({ page }) => {
  await ready(page); const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(result.violations).toEqual([]);
  await page.screenshot({ path: '/tmp/cozy-dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: '/tmp/cozy-dashboard-mobile.png', fullPage: true }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toggle navigation' }).click(); await expect(page.getByRole('link', { name: 'Science Island' })).toBeVisible();
});
