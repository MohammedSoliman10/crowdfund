import { expect, test } from '@playwright/test';

/**
 * US1 — browse the catalogue with NO wallet installed:
 * paging, status tabs, search, detail window, disabled-action reasons,
 * and the accessible status log.
 */
test.describe('US1 browse (no wallet)', () => {
  test('lists, pages, filters, and searches the catalogue', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('campaign-list-window')).toBeVisible();
    await expect(page.getByTestId('campaign-card')).toHaveCount(12);
    await expect(page.getByTestId('list-count')).toContainText('of 14');

    // Load more (14 seeded → 12 visible + 2 pending)
    await page.getByTestId('load-more').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(14);
    await expect(page.getByTestId('load-more')).toHaveCount(0);

    // Status tabs (Clarification Q3)
    await page.getByTestId('filter-live').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(1);
    await expect(page.getByTestId('card-title')).toHaveText('Community Mesh Wi-Fi');
    await expect(page.getByTestId('status-chip')).toHaveText('LIVE');

    await page.getByTestId('filter-successful').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(1);
    await expect(page.getByTestId('card-title')).toHaveText('Neighborhood Storm Drain');
    await expect(page.getByTestId('status-chip')).toContainText('SUCCESSFUL');

    await page.getByTestId('filter-failed').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(1);
    await expect(page.getByTestId('card-title')).toHaveText('Old Dock Repair');
    await expect(page.getByTestId('status-chip')).toContainText('FAILED');

    await page.getByTestId('filter-upcoming').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(11);

    // Tab changes reset paging to the first page (by design)
    await page.getByTestId('filter-all').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(12);
    await page.getByTestId('load-more').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(14);
    await expect(page.getByTestId('load-more')).toHaveCount(0);

    // Title search + empty-result recovery (search also resets paging)
    await page.getByTestId('search-input').fill('arcade');
    await expect(page.getByTestId('campaign-card')).toHaveCount(1);
    await expect(page.getByTestId('card-title')).toHaveText('Retro Arcade Restoration');

    await page.getByTestId('search-input').fill('zzz no such campaign');
    await expect(page.getByTestId('empty-result')).toBeVisible();
    await page.getByTestId('clear-search').click();
    await expect(page.getByTestId('campaign-card')).toHaveCount(12);
    await expect(page.getByTestId('list-count')).toContainText('of 14');
    await expect(page.getByTestId('load-more')).toBeVisible();
  });

  test('detail window reads full campaign data; gated controls carry reasons', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-input').fill('arcade');
    await page.getByTestId('campaign-card').click();

    await expect(page.getByTestId('campaign-detail-window')).toBeVisible();
    await expect(page.getByTestId('detail-title')).toHaveText('Retro Arcade Restoration');
    await expect(page.getByTestId('detail-description')).toContainText('Restore a 1980s arcade hall');
    await expect(page.getByTestId('detail-goal')).toContainText('Goal: 5K CFT');
    await expect(page.getByTestId('detail-creator')).toContainText('0xf39F');
    await expect(page.getByTestId('detail-creator')).toContainText('2266');
    await expect(page.getByTestId('campaign-detail-window').getByTestId('status-chip')).toHaveText('UPCOMING');
    await expect(page.getByTestId('detail-start')).toContainText('Starts:');
    await expect(page.getByTestId('detail-end')).toContainText('Ends:');

    // No wallet → every action explains why it is unavailable (contract §4)
    await expect(page.getByTestId('pledge-form')).toBeVisible();
    const reasons = (await page.getByTestId('disabled-reason').allTextContents()).join(' | ');
    expect(reasons).toContain('No wallet detected');
    expect(reasons).toContain('install an injected wallet');

    // Welcome window is replaced while a detail is open, restored on close
    await expect(page.getByTestId('welcome-window')).toHaveCount(0);
    await page.getByTestId('window-close').click();
    await expect(page.getByTestId('welcome-window')).toBeVisible();
    await expect(page.getByTestId('campaign-detail-window')).toHaveCount(0);
  });

  test('status log is an accessible, polite live region with sync messages', async ({ page }) => {
    await page.goto('/');
    const terminal = page.getByTestId('terminal');
    await expect(terminal).toHaveAttribute('role', 'log');
    await expect(terminal).toHaveAttribute('aria-live', 'polite');
    await expect(terminal).toHaveAttribute('aria-label', 'Status log');
    await expect(page.getByTestId('terminal-line').filter({ hasText: 'campaigns synced' }).first()).toBeVisible();
  });

  test('shows the no-wallet notice with a reason on the disabled connect button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('no-wallet-notice')).toContainText('No wallet detected');
    await expect(page.getByTestId('connect-wallet')).toBeVisible();
    await expect(page.getByTestId('disabled-reason')).toContainText('No injected wallet detected');
  });
});
