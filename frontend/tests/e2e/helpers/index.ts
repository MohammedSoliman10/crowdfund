import fs from 'node:fs';
import path from 'node:path';
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import type { Page } from '@playwright/test';

export const RPC = 'http://127.0.0.1:8545';
export const CHAIN_ID_HEX = '0x7a69'; // 31337
const MNEMONIC = 'test test test test test test test test test test test junk';

/** anvil account #0 — creator of every seeded campaign */
export const CREATOR_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
/** anvil account #1 — the backer (holds minted CFT, stakes in #3/#4) */
export const BACKER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

/** Addresses as written in src/config/contracts.ts (single source: read + parse) */
export function readAddresses(): { crowdFund: `0x${string}`; pledgeToken: `0x${string}` } {
  const file = path.join(__dirname, '../../src/config/contracts.ts');
  const src = fs.readFileSync(file, 'utf8');
  const block = src.match(/31337: \{([\s\S]*?)\},/);
  if (!block) throw new Error('31337 addresses not found in contracts.ts');
  const all = [...block[1].matchAll(/\|\|\s*'(0x[0-9a-fA-F]{40})'/g)].map((m) => m[1]);
  if (all.length < 2) throw new Error('could not parse addresses');
  return { crowdFund: all[0] as `0x${string}`, pledgeToken: all[1] as `0x${string}` };
}

export const chain = {
  id: 31337,
  name: 'Anvil (Local)',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  testnet: true,
} as const;

export function publicClient() {
  return createPublicClient({ transport: http(RPC) });
}

/** anvil account #1 — the standard backer in tests (holds minted CFT) */
export function backerWallet() {
  return createWalletClient({ account: mnemonicToAccount(MNEMONIC, { addressIndex: 1 }), transport: http(RPC) });
}

/** anvil account #0 — creator of every seeded campaign */
export function creatorWallet() {
  return createWalletClient({ account: mnemonicToAccount(MNEMONIC, { addressIndex: 0 }), transport: http(RPC) });
}

export async function warpTo(timestampSeconds: number): Promise<void> {
  const client = publicClient();
  await client.request({ method: 'evm_setNextBlockTimestamp' as never, params: [timestampSeconds] as never });
  await client.request({ method: 'evm_mine' as never, params: [] as never });
}

export async function chainNow(): Promise<number> {
  return Number((await publicClient().getBlock()).timestamp);
}

export async function mint(address: `0x${string}`, amountEth: string): Promise<void> {
  const client = creatorWallet();
  const { pledgeToken } = readAddresses();
  const hash = await client.sendTransaction({
    address: pledgeToken,
    abi: [
      { name: 'mint', type: 'function', stateMutability: 'nonpayable',
        inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
    ],
    functionName: 'mint',
    args: [address, parseEther(amountEth)],
    chain,
  } as never);
  await publicClient().waitForTransactionReceipt({ hash });
}

/**
 * Injected EIP-1193 stub (Clarification Q2 — injected wallets only).
 * Proxies JSON-RPC to anvil (default accounts are unlocked, so
 * eth_sendTransaction works without key management).
 * - `chainId`: overrides eth_chainId (simulate a wallet on an unsupported network)
 * - `accounts`: restricts what eth_requestAccounts/eth_accounts return
 *   (per-site account selection, like a real wallet)
 */
export async function installWallet(
  page: Page,
  opts?: { chainId?: string; accounts?: readonly string[] },
): Promise<void> {
  const chainId = opts?.chainId ?? CHAIN_ID_HEX;
  const onlyAccounts = opts?.accounts ? [...opts.accounts] : null;
  await page.addInitScript(
    ({ configuredChainId, restricted }: { configuredChainId: string; restricted: string[] | null }) => {
      const rpc = async (method: string, params?: unknown) => {
        const response = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: Math.floor(Math.random() * 1e9), method, params: params ?? [] }),
        });
        const json = await response.json();
        if (json.error) {
          const error = new Error(json.error.message) as Error & { code?: number };
          error.code = json.error.code;
          throw error;
        }
        return json.result;
      };

      const provider = {
        isMetaMask: true,
        chainId: configuredChainId,
        request: async (args: { method: string; params?: unknown }) => {
          if (args.method === 'eth_chainId') return configuredChainId;
          if (args.method === 'eth_requestAccounts' || args.method === 'eth_accounts') {
            const list = (await rpc(args.method, args.params)) as string[];
            if (restricted && restricted.length > 0) {
              // anvil returns lowercase; our constants are checksummed — compare case-insensitively
              const wanted = new Set(restricted.map((a) => a.toLowerCase()));
              return list.filter((account) => wanted.has(account.toLowerCase()));
            }
            return list;
          }
          if (args.method === 'wallet_requestPermissions') {
            return {
              eth_accounts: {
                parentCapability: 'eth_accounts',
                invoker: 'stub',
                caveats: [{ type: 'restrictReturnedAccounts', value: [] }],
                date: Date.now(),
                expiry: Number.MAX_SAFE_INTEGER,
              },
            };
          }
          return rpc(args.method, args.params);
        },
        on: (_event: string, _listener: unknown) => provider,
        removeListener: () => true,
        removeAllListeners: () => provider,
      };

      (window as unknown as { ethereum: unknown }).ethereum = provider;
    },
    { configuredChainId: chainId, restricted: onlyAccounts },
  );
}

/** Latest terminal line text (status log assertions) */
export async function lastTerminalLine(page: Page): Promise<string> {
  const lines = page.getByTestId('terminal-line');
  return (await lines.last().textContent()) ?? '';
}

/** True when the terminal contains any line matching the text */
export async function terminalHas(page: Page, text: string | RegExp): Promise<boolean> {
  return page.getByTestId('terminal-line').filter({ hasText: text }).count().then((n) => n > 0);
}
