/* eslint-disable no-console */
/**
 * Prints the seeded catalogue with derived statuses — used for quickstart
 * validation and as e2e preflight evidence.
 * Run: node scripts/verify.mjs
 */
import fs from 'node:fs';
import { createPublicClient, http } from 'viem';

const abi = JSON.parse(fs.readFileSync(new URL('../src/abis/CrowdFund.json', import.meta.url), 'utf8'));
const pub = createPublicClient({ transport: http('http://127.0.0.1:8545') });
const FUND = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const ZERO = '0x0000000000000000000000000000000000000000';
const ALICE = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const BOB = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const erc20 = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

async function main() {
  const count = Number(await pub.readContract({ address: FUND, abi, functionName: 'count' }));
  const now = Number((await pub.getBlock()).timestamp);
  console.log(`count=${count}  chainNow=${now}  wallNow=${Math.floor(Date.now() / 1000)}  drift=${Math.round((now - Date.now() / 1000) / 3600)}h`);

  const tally = {};
  for (let id = 1; id <= count; id++) {
    const r = await pub.readContract({ address: FUND, abi, functionName: 'campaigns', args: [BigInt(id)] });
    const [creator, goal, pledged, startAt, endAt, claimed, title] = Array.isArray(r) ? r : Object.values(r);
    let status;
    if (creator.toLowerCase() === ZERO) status = 'cancelled';
    else if (now < Number(startAt)) status = 'upcoming';
    else if (now <= Number(endAt)) status = 'live';
    else status = pledged >= goal ? 'successful' : 'failed';
    tally[status] = (tally[status] ?? 0) + 1;
    console.log(
      ` #${String(id).padStart(2)} ${status.padEnd(10)} ${(claimed ? 'claimed' : 'unclaimed').padEnd(9)}` +
      ` ${String(pledged / 10n ** 18n).padStart(5)}/${String(goal / 10n ** 18n)} CFT` +
      `  endsIn=${Math.round((Number(endAt) - now) / 86400)}d  ${title}`,
    );
  }

  const alice = await pub.readContract({ address: TOKEN, abi: erc20, functionName: 'balanceOf', args: [ALICE] });
  const bob = await pub.readContract({ address: TOKEN, abi: erc20, functionName: 'balanceOf', args: [BOB] });
  const stake = await pub.readContract({ address: FUND, abi, functionName: 'pledgedAmount', args: [4n, ALICE] });
  console.log(`alice CFT=${alice / 10n ** 18n}  bob CFT=${bob / 10n ** 18n}  alice stake in #4=${stake / 10n ** 18n}`);
  console.log('status tally:', JSON.stringify(tally));

  const problems = [];
  if (count !== 14) problems.push(`count ${count} != 14`);
  if (alice !== 3_000n * 10n ** 18n) problems.push(`alice ${alice / 10n ** 18n} != 3000`);
  if (bob !== 7_000n * 10n ** 18n) problems.push(`bob ${bob / 10n ** 18n} != 7000`);
  if (stake !== 500n * 10n ** 18n) problems.push(`stake #4 ${stake / 10n ** 18n} != 500`);
  if (tally.successful !== 1) problems.push('expected 1 successful');
  if (tally.live !== 1) problems.push('expected 1 live');
  if (tally.failed !== 1) problems.push('expected 1 failed');
  if (tally.upcoming !== 11) problems.push('expected 11 upcoming');

  if (problems.length) {
    console.error('VERIFY FAILED:', problems.join('; '));
    process.exit(1);
  }
  console.log('VERIFY OK');
}

main().catch((err) => {
  console.error(err.shortMessage ?? err.message);
  process.exit(1);
});
