import { expect, test } from '@playwright/test';
import { installWallet } from './helpers';

/**
 * US3 — creator flows: launch (with pre-flight validation), cancel
 * (confirm dialog + hidden from lists), claim (+ re-claim gate),
 * and started-campaign cancel gate. Runs as anvil account #0, the
 * creator of every seeded campaign.
 */
test.describe('US3 creator flows', () => {
  test.beforeEach(async ({ page }) => {
    await installWallet(page);
    await page.goto('/');
    await page.getByTestId('connect-wallet').click();
    await expect(page.getByTestId('account-chip')).toContainText('0xf39F');
  });

  test('launch validation shows plain-language errors without sending a transaction', async ({
    page,
  }) => {
    await page.getByTestId('launch-open').click();
    await expect(page.getByTestId('launch-dialog')).toBeVisible();
    // date defaults are seeded from chain time — wait until populated
    await expect(page.getByTestId('launch-start')).not.toHaveValue('');

    await page.getByTestId('launch-goal').fill('500');
    await page.getByTestId('launch-submit').click();
    await expect(page.getByTestId('launch-error-message')).toContainText('Give your campaign a title.');

    await page.getByTestId('launch-title').fill('Needs A Description');
    await page.getByTestId('launch-submit').click();
    await expect(page.getByTestId('launch-error-message')).toContainText('Add a description');

    // No launch transaction was attempted (layer-1 pre-flight only)
    await expect(page.getByTestId('terminal-line').filter({ hasText: 'launch — waiting' })).toHaveCount(
      0,
    );

    await page.getByTestId('launch-cancel').click();
    await expect(page.getByTestId('launch-dialog')).toHaveCount(0);
  });

  test('launch succeeds end-to-end, then cancel hides the campaign', async ({ page }) => {
    await page.getByTestId('launch-open').click();
    await expect(page.getByTestId('launch-start')).not.toHaveValue('');

    await page.getByTestId('launch-goal').fill('2500');
    await page.getByTestId('launch-title').fill('Playwright Launch Test');
    await page
      .getByTestId('launch-description')
      .fill('Automated launch verifying the US3 flow from dialog to on-chain confirmation.');
    await page.getByTestId('launch-submit').click();

    // dialog closes → new campaign auto-opens in the detail window
    await expect(page.getByTestId('launch-dialog')).toHaveCount(0, { timeout: 30_000 });
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'launch confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('campaign-detail-window')).toBeVisible();
    await expect(page.getByTestId('detail-title')).toHaveText('Playwright Launch Test');
    await expect(page.getByTestId('campaign-detail-window').getByTestId('status-chip')).toHaveText(
      'UPCOMING',
    );
    await expect(page.getByTestId('list-count')).toContainText('of 15', { timeout: 20_000 });

    // --- cancel: confirm dialog required, plain-language warning
    await page.getByTestId('cancel-button').click();
    await expect(page.getByTestId('cancel-dialog')).toBeVisible();
    await expect(page.getByTestId('cancel-warning')).toContainText('cannot be undone');
    await page.getByTestId('cancel-confirm').click();

    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'cancel confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('campaign-detail-window')).toHaveCount(0);

    // cancelled campaigns disappear from listings (deleted on-chain)
    await page.getByTestId('search-input').fill('Playwright Launch Test');
    await expect(page.getByTestId('empty-result')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('list-count')).toContainText('(14 on chain)', { timeout: 20_000 });
  });

  test('claim a successful campaign; second claim is gated', async ({ page }) => {
    await page.getByTestId('search-input').fill('storm');
    await page.getByTestId('campaign-card').click();
    await expect(page.getByTestId('detail-title')).toHaveText('Neighborhood Storm Drain');
    await expect(page.getByTestId('campaign-detail-window').getByTestId('status-chip')).toContainText(
      'SUCCESSFUL',
    );

    await expect(page.getByTestId('claim-button')).toBeEnabled();
    await page.getByTestId('claim-button').click();
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'claim confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // refreshed record: claimed marker + gated re-claim with a plain reason
    await expect(page.getByTestId('campaign-detail-window').getByTestId('status-chip')).toContainText(
      '✓',
      { timeout: 20_000 },
    );
    await expect(page.getByTestId('claim-button')).toBeDisabled({ timeout: 20_000 });
    const claimReasons = (await page.getByTestId('disabled-reason').allTextContents()).join(' | ');
    expect(claimReasons).toContain('already been claimed');
  });

  test('started campaigns cannot be cancelled — reason shown', async ({ page }) => {
    await page.getByTestId('search-input').fill('mesh');
    await page.getByTestId('campaign-card').click();
    await expect(page.getByTestId('campaign-detail-window').getByTestId('status-chip')).toHaveText(
      'LIVE',
    );

    await expect(page.getByTestId('cancel-button')).toBeDisabled();
    const cancelReasons = (await page.getByTestId('disabled-reason').allTextContents()).join(' | ');
    expect(cancelReasons).toContain('already started');
    expect(cancelReasons).toContain('can’t be cancelled');
  });
});
