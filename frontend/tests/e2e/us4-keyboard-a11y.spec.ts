import { expect, test } from '@playwright/test';
import { BACKER_ADDRESS, installWallet } from './helpers';

/**
 * US4 — baseline accessibility, retro fidelity checks that are objective,
 * and first-load/interaction performance (SC-006).
 */

/** WCAG contrast ratio between an element's text and its effective background */
async function contrastOf(page: import('@playwright/test').Page, selector: string): Promise<number | null> {
  return page.evaluate((sel) => {
    const parse = (color: string): [number, number, number] | null => {
      const m = color.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a] = m[1].split(',').map(Number);
      if (a === 0) return null;
      return [r, g, b];
    };
    const luminance = ([r, g, b]: [number, number, number]) => {
      const channel = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const el = document.querySelector(sel);
    if (!el) return null;
    const fg = parse(getComputedStyle(el).color);
    if (!fg) return null;
    let node: Element | null = el;
    let bg: [number, number, number] = [255, 255, 255];
    while (node) {
      const parsed = parse(getComputedStyle(node).backgroundColor);
      if (parsed) {
        bg = parsed;
        break;
      }
      node = node.parentElement;
    }
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
  }, selector);
}

test.describe('US4 accessibility + fidelity', () => {
  test('keyboard: navy dashed focus ring reaches controls; Enter opens a card', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();

    // First tab stop = connect button, styled with the retro focus ring
    await page.keyboard.press('Tab');
    const focus1 = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      const style = el ? getComputedStyle(el) : null;
      return {
        testid: el?.dataset.testid ?? null,
        outlineStyle: style?.outlineStyle ?? '',
        outlineWidth: style?.outlineWidth ?? '',
        outlineColor: style?.outlineColor ?? '',
      };
    });
    expect(focus1.testid).toBe('connect-wallet');
    expect(focus1.outlineStyle).toBe('dashed');
    expect(focus1.outlineWidth).toBe('2px');
    expect(focus1.outlineColor).toBe('rgb(0, 0, 128)'); // VGA navy

    // Second tab stop = first filter button — same ring
    await page.keyboard.press('Tab');
    const focus2 = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? '');
    expect(focus2).toBe('filter-all');

    // Enter (keyboard activation) on a card opens the detail window
    const card = page.getByTestId('campaign-card').first();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('campaign-detail-window')).toBeVisible();
  });

  test('dialog: Esc closes it and Tab is trapped inside', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-open').click();
    await expect(page.getByTestId('launch-dialog')).toBeVisible();

    // focus starts inside the dialog (Dialog focuses the first control)
    for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
    const stillInside = await page.evaluate(
      () =>
        !!document
          .querySelector('[data-testid="launch-dialog"]')
          ?.contains(document.activeElement),
    );
    expect(stillInside).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('launch-dialog')).toHaveCount(0);
  });

  test('WCAG AA contrast on key text/background pairs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();

    const pairs: Array<[string, number]> = [
      ['h1', 4.5], // navy on silver — app title
      ['[data-testid="campaign-list-window"] h2', 4.5], // paper on navy — title bar
      ['[data-testid="card-snippet"]', 4.5], // black on paper — body copy
      ['[data-testid="status-chip"]', 4.5], // status chip (any palette pairing)
      ['[data-testid="terminal-line"]', 4.5], // green/silver/red on black — log lines
      ['label', 4.5], // navy on silver — field labels
    ];

    const failures: string[] = [];
    for (const [selector, min] of pairs) {
      await expect(page.locator(selector).first()).toBeVisible();
      const ratio = await contrastOf(page, selector);
      if (ratio === null || ratio < min) failures.push(`${selector}: ${ratio} < ${min}`);
    }
    expect(failures, failures.join('; ')).toEqual([]);
  });

  test('text resize scales the UI (rem-based, no clipped actions)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();

    const base = await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '150%';
    });
    const enlarged = await page.locator('h1').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(enlarged).toBeGreaterThanOrEqual(base * 1.4);

    // key actions remain visible at the larger size
    await expect(page.getByTestId('launch-open')).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
  });

  test('no animations/transitions — instant retro state changes', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();
    await page.getByTestId('campaign-card').first().hover();
    const animations = await page.evaluate(() => document.getAnimations().length);
    expect(animations).toBe(0);
  });

  test('performance: first usable content < 3s; filters feel instant', async ({ page }) => {
    // warm the dev-server module graph
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();

    const started = Date.now();
    await page.reload();
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();
    const firstUsable = Date.now() - started;
    expect(firstUsable, `first usable took ${firstUsable}ms`).toBeLessThan(3_000);

    const filterStart = Date.now();
    await page.getByTestId('filter-live').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(1);
    const filterElapsed = Date.now() - filterStart;
    expect(filterElapsed, `filter took ${filterElapsed}ms`).toBeLessThan(1_500);
  });

  test('FR-020 responsive: narrow laptop → wide desktop, no clipped or frozen layout', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();

    for (const width of [1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 800 });

      // no horizontal overflow (nothing clipped off-screen)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow of ${overflow}px at ${width}px wide`).toBeLessThanOrEqual(
        0,
      );

      // controls remain clickable at every width
      await page.getByTestId('filter-live').click();
      await expect(page.getByTestId('campaign-card')).toHaveCount(1);
      await page.getByTestId('filter-all').click();
      await expect(page.getByTestId('campaign-card')).toHaveCount(12);
    }

    // side-by-side list + detail columns at laptop width and up (stacked below lg)
    await page.setViewportSize({ width: 1024, height: 800 });
    const columns = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="desktop"]');
      return el ? getComputedStyle(el).gridTemplateColumns.split(' ').length : 0;
    });
    expect(columns).toBe(2);
  });

  test('keyboard-only: connect, search, open a campaign, pledge, and open launch (T059)', async ({
    page,
  }) => {
    await installWallet(page, { accounts: [BACKER_ADDRESS] });
    await page.goto('/');
    await expect(page.getByTestId('campaign-card').first()).toBeVisible();

    const activeId = () =>
      page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? '');
    const tabUntil = async (testId: string, max = 60) => {
      for (let i = 0; i <= max; i++) {
        if ((await activeId()) === testId) return;
        await page.keyboard.press('Tab');
      }
      throw new Error(`never focused [${testId}] — last focus was [${await activeId()}]`);
    };

    // 1. connect with the keyboard only (Tab to first stop, Enter)
    await page.keyboard.press('Tab');
    expect(await activeId()).toBe('connect-wallet');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('account-chip')).toBeVisible();

    // 2. keyboard search down to the single live campaign, Enter opens detail
    await tabUntil('search-input');
    await page.keyboard.type('mesh');
    await tabUntil('campaign-card');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('pledge-form')).toBeVisible();
    await expect(page.getByTestId('detail-title')).toHaveText('Community Mesh Wi-Fi');

    // 3. Tab into the amount field, type, Enter submits the form (auto-approve + pledge)
    await tabUntil('pledge-amount');
    await page.keyboard.type('5');
    await page.keyboard.press('Enter');
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'pledge confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // 4. back around to the Launch control; Enter opens the dialog with focus trapped inside
    await tabUntil('launch-open');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('launch-dialog')).toBeVisible();
    await page.waitForFunction(
      () =>
        !!document.querySelector('[data-testid="launch-dialog"]')?.contains(document.activeElement),
    );
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('launch-dialog')).toHaveCount(0);
  });
});
