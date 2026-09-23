/* eslint-disable no-console */
/**
 * Seeds the local anvil chain with a realistic catalogue (quickstart setup):
 *   id14..6  filler upcoming campaigns (paged list needs >12)
 *   A upcoming · B successful-unclaimed · C live-partial · D failed-staked · F upcoming
 *
 * Run: node scripts/seed.mjs   (anvil must be running on :8545)
 */
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

const RPC = 'http://127.0.0.1:8545';
const MNEMONIC = 'test test test test test test test test test test test junk';
const CROWD_FUND = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const cfAbi = [
  { type: 'function', name: 'launch', stateMutability: 'nonpayable',
    inputs: [
      { name: '_goal', type: 'uint256' }, { name: '_startAt', type: 'uint32' },
      { name: '_endAt', type: 'uint32' }, { name: '_title', type: 'string' },
      { name: '_description', type: 'string' },
    ], outputs: [] },
  { type: 'function', name: 'pledge', stateMutability: 'nonpayable',
    inputs: [{ name: '_id', type: 'uint256' }, { name: '_amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'count', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];

const erc20Abi = [
  { type: 'function', name: 'mint', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const publicClient = createPublicClient({ transport: http(RPC) });
const deployerAccount = mnemonicToAccount(MNEMONIC, { addressIndex: 0 });
const aliceAccount = mnemonicToAccount(MNEMONIC, { addressIndex: 1 });
const bobAccount = mnemonicToAccount(MNEMONIC, { addressIndex: 2 });

const deployer = createWalletClient({ account: deployerAccount, transport: http(RPC) });
const alice = createWalletClient({ account: aliceAccount, transport: http(RPC) });
const bob = createWalletClient({ account: bobAccount, transport: http(RPC) });

const chain = {
  id: 31337,
  name: 'Anvil (Local)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  testnet: true,
};

async function send(client, args) {
  try {
    // writeContract (NOT sendTransaction) — the contract-params form is writeContract's API
    const hash = await client.writeContract(args);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      console.error(`  ✗ ${args.functionName} REVERTED (tx ${hash})`);
      process.exit(1);
    }
    return hash;
  } catch (err) {
    console.error(`  ✗ ${args.functionName} FAILED: ${err.shortMessage ?? err.message}`);
    if (err.metaMessages) console.error(err.metaMessages.join('\n'));
    process.exit(1);
  }
}

async function warpTo(ts) {
  await publicClient.request({ method: 'evm_setNextBlockTimestamp', params: [Number(ts)] });
  await publicClient.request({ method: 'evm_mine', params: [] });
}

async function now() {
  return Number((await publicClient.getBlock()).timestamp);
}

async function launch(client, goalEth, startAt, endAt, title, description) {
  await send(client, {
    account: client.account,
    address: CROWD_FUND,
    abi: cfAbi,
    functionName: 'launch',
    args: [parseEther(goalEth), Math.floor(startAt), Math.floor(endAt), title, description],
    chain,
  });
  const count = await publicClient.readContract({ address: CROWD_FUND, abi: cfAbi, functionName: 'count' });
  console.log(`  #${count} ${title}`);
}

async function approveAndPledge(client, id, amountEth) {
  await send(client, {
    address: TOKEN, abi: erc20Abi, functionName: 'approve',
    args: [CROWD_FUND, parseEther(amountEth)], chain,
  });
  await send(client, {
    address: CROWD_FUND, abi: cfAbi, functionName: 'pledge',
    args: [BigInt(id), parseEther(amountEth)], chain,
  });
}

async function main() {
  // sanity
  const count0 = await publicClient.readContract({ address: CROWD_FUND, abi: cfAbi, functionName: 'count' });
  if (Number(count0) >= 14) {
    console.log(`already seeded (count=${count0}) — skipping`);
    return;
  }

  console.log('minting test balances…');
  await send(deployer, { address: TOKEN, abi: erc20Abi, functionName: 'mint', args: [aliceAccount.address, parseEther('10000')], chain });
  await send(deployer, { address: TOKEN, abi: erc20Abi, functionName: 'mint', args: [bobAccount.address, parseEther('10000')], chain });

  const t0 = await now();
  console.log('launching core campaigns…');

  // A: upcoming (starts in 10 days)
  await launch(deployer, '5000', t0 + 10 * 86400, t0 + 20 * 86400,
    'Retro Arcade Restoration',
    'Restore a 1980s arcade hall: cabinets, CRT tubes, neon signage, and a public play night every month.');

  // B: will become successful (goal exactly met), start in 20s so we can warp
  await launch(deployer, '7000', t0 + 20, t0 + 5 * 86400,
    'Neighborhood Storm Drain',
    'Regrade the blocked storm drain on 5th street before the rainy season.');

  // C: will stay live through all warps (45 days)
  await launch(deployer, '20000', t0 + 40, t0 + 45 * 86400,
    'Community Mesh Wi-Fi',
    'Deploy twelve mesh relay nodes so the whole block gets free community internet.');

  // make B + C live, then fund them
  await warpTo(t0 + 60);
  console.log('funding…');
  await approveAndPledge(alice, 2, '4000'); // B
  await approveAndPledge(bob, 2, '3000');   // B → exactly 7000/7000
  await approveAndPledge(alice, 3, '2500'); // C → partial live funding

  // warp past B's end → B = successful, unclaimed
  await warpTo(t0 + 5 * 86400 + 3600);
  const t1 = await now();

  // D: short campaign that will fail (stake left in for the refund test)
  await launch(deployer, '9000', t1 + 20, t1 + 3600, 'Old Dock Repair',
    'Replace rotted planks and railings on the public fishing dock.');
  await warpTo(t1 + 60);
  await approveAndPledge(alice, 4, '500');

  // warp past D's end → D = failed with alice's stake intact
  await warpTo(t1 + 2 * 3600);
  const t2 = await now();

  // F: another upcoming campaign
  await launch(deployer, '12000', t2 + 8 * 86400, t2 + 18 * 86400,
    'Library Roof Solar',
    'Twelve panels on the branch library roof to cut the electricity bill for the reading room.');

  // filler upcoming campaigns so paging (12/page) is exercised
  console.log('launching filler campaigns…');
  for (let i = 1; i <= 9; i++) {
    const n = String(i).padStart(2, '0');
    await launch(deployer, String(1000 + i * 100),
      t2 + (10 + i) * 86400, t2 + (30 + i) * 86400,
      `Community Garden ${n}`,
      `Raised beds, a tool shed, and water hookup for community garden plot ${n}.`);
  }

  const final = await publicClient.readContract({ address: CROWD_FUND, abi: cfAbi, functionName: 'count' });
  const aliceBal = await publicClient.readContract({
    address: TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [aliceAccount.address],
  });
  const bobBal = await publicClient.readContract({
    address: TOKEN, abi: erc20Abi, functionName: 'balanceOf', args: [bobAccount.address],
  });
  console.log(`\nseed complete: count=${final} aliceCFT=${aliceBal} bobCFT=${bobBal}`);
  // alice: 10000 minted − 4000 (B) − 2500 (C) − 500 (D) = 3000; bob: 10000 − 3000 (B) = 7000
  if (Number(final) !== 14 || aliceBal !== parseEther('3000') || bobBal !== parseEther('7000')) {
    console.error('SEED VERIFICATION FAILED');
    process.exit(1);
  }
  console.log(`alice=${aliceAccount.address} bob=${bobAccount.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
