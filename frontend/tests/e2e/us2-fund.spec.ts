import { expect, test } from '@playwright/test';
import { BACKER_ADDRESS, installWallet } from './helpers';

/**
 * US2 — pledge/unpledge money flows plus wallet/network states.
 * Runs against seeded campaign #3 (live, alice staked 2500) and
 * #4 (failed, alice staked 500).
 */
test.describe('US2 pledge flows', () => {
  test('connect and disconnect log to the status terminal', async ({ page }) => {
    await installWallet(page);
    await page.goto('/');

    await page.getByTestId('connect-wallet').click();
    await expect(page.getByTestId('account-chip')).toContainText('0xf39F');
    await expect(page.getByTestId('network-chip')).toHaveText(/Anvil/i);
    await expect(page.getByTestId('network-warning')).toHaveCount(0);
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'wallet connected' }).first(),
    ).toBeVisible();

    await page.getByTestId('disconnect-wallet').click();
    await expect(page.getByTestId('account-chip')).toHaveCount(0);
    await expect(page.getByTestId('connect-wallet')).toBeVisible();
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'wallet disconnected' }).first(),
    ).toBeVisible();
  });

  test('pledge (auto-approve), unpledge, and pre-flight balance rejection', async ({ page }) => {
    await installWallet(page, { accounts: [BACKER_ADDRESS] });
    await page.goto('/');
    await page.getByTestId('connect-wallet').click();
    await expect(page.getByTestId('account-chip')).toContainText('0x7099');

    await page.getByTestId('search-input').fill('mesh');
    await page.getByTestId('campaign-card').click();
    await expect(page.getByTestId('detail-title')).toHaveText('Community Mesh Wi-Fi');
    await expect(page.getByTestId('token-balance')).toContainText('Balance: 3,000 CFT');
    await expect(page.getByTestId('detail-stake')).toContainText('Your stake: 2,500 CFT');
    await expect(page.getByTestId('pledge-submit')).toBeEnabled();

    // --- pledge: approve + pledge (two txs), totals refresh only after confirmation
    await page.getByTestId('pledge-amount').fill('100');
    await page.getByTestId('pledge-submit').click();
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'approval confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'pledge confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('detail-stake')).toContainText('Your stake: 2,600 CFT', {
      timeout: 20_000,
    });
    await expect(page.getByTestId('token-balance')).toContainText('Balance: 2,900 CFT');
    await expect(page.getByTestId('pledge-amount')).toHaveValue('');

    // --- unpledge (no approval needed: token already returned)
    await page.getByTestId('unpledge-amount').fill('60');
    await page.getByTestId('unpledge-submit').click();
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'unpledge confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('detail-stake')).toContainText('Your stake: 2,540 CFT', {
      timeout: 20_000,
    });
    await expect(page.getByTestId('token-balance')).toContainText('Balance: 2,960 CFT');

    // --- pre-flight rejection: the failed attempt must send NO transaction
    const waitingBefore = await page
      .getByTestId('terminal-line')
      .filter({ hasText: 'pledge — waiting' })
      .count();
    await page.getByTestId('pledge-amount').fill('999999');
    await page.getByTestId('pledge-submit').click();
    await expect(page.getByTestId('input-error')).toContainText('You don’t have enough pledge tokens.');
    await expect(page.getByTestId('detail-stake')).toContainText('Your stake: 2,540 CFT');
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'pledge — waiting' }),
    ).toHaveCount(waitingBefore);
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'enough pledge tokens' }).first(),
    ).toBeVisible();
  });

  test('refund on a failed campaign, then the exhausted-stake reason', async ({ page }) => {
    await installWallet(page, { accounts: [BACKER_ADDRESS] });
    await page.goto('/');
    await page.getByTestId('connect-wallet').click();

    await page.getByTestId('search-input').fill('dock');
    await page.getByTestId('campaign-card').click();
    await expect(page.getByTestId('detail-title')).toHaveText('Old Dock Repair');
    await expect(page.getByTestId('campaign-detail-window').getByTestId('status-chip')).toContainText(
      'FAILED',
    );
    await expect(page.getByTestId('detail-stake')).toContainText('Your stake: 500 CFT');

    // Creator-only gate visible to a non-creator backer
    await expect(page.getByTestId('claim-button')).toBeDisabled();
    const claimReason = page
      .locator('[aria-label="Creator actions"]')
      .getByTestId('disabled-reason')
      .first();
    await expect(claimReason).toContainText('Only the campaign creator can do that.');

    // Refund executes and then reports there is nothing left to refund
    await expect(page.getByTestId('refund-button')).toBeEnabled();
    await page.getByTestId('refund-button').click();
    await expect(
      page.getByTestId('terminal-line').filter({ hasText: 'refund confirmed' }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('detail-stake')).toContainText('Your stake: 0 CFT', {
      timeout: 20_000,
    });
    await expect(page.getByTestId('refund-button')).toBeDisabled();
    const refundReasons = (await page.getByTestId('disabled-reason').allTextContents()).join(' | ');
    expect(refundReasons).toContain('nothing to refund');
  });

  test('wrong network shows a warning and blocks writes with a switch reason', async ({ page }) => {
    // Stub reports chainId 0x1 (mainnet) — an unsupported network for this app
    await installWallet(page, { accounts: [BACKER_ADDRESS], chainId: '0x1' });
    await page.goto('/');
    await page.getByTestId('connect-wallet').click();

    await expect(page.getByTestId('network-warning')).toBeVisible();
    await expect(page.getByTestId('network-warning')).toContainText('wrong network');

    await page.getByTestId('launch-open').click();
    await expect(page.getByTestId('launch-dialog')).toBeVisible();
    await expect(page.getByTestId('launch-submit')).toBeDisabled();
    await expect(
      page.getByTestId('launch-dialog').getByTestId('disabled-reason'),
    ).toContainText('switch to continue');
  });
});
