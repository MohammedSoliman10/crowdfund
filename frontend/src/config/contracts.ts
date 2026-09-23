/**
 * Chain id → deployed contract addresses (research R8).
 * Values are env-overridable; local placeholders are wired after running
 * contracts/script/Deploy.s.sol (tasks T009/T014).
 */
export interface DeployedAddresses {
  crowdFund: `0x${string}`;
  pledgeToken: `0x${string}`;
}

const ZERO = '0x0000000000000000000000000000000000000000' as const;

const env = import.meta.env as Record<string, string | undefined>;

export const ADDRESSES: Record<number, DeployedAddresses> = {
  // Local anvil — last deploy of contracts/script/Deploy.s.sol (tasks T009/T014)
  31337: {
    crowdFund: (env.VITE_CROWDFUND_ADDRESS as `0x${string}`) || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    pledgeToken: (env.VITE_TOKEN_ADDRESS as `0x${string}`) || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
  // Sepolia live target — placeholders until testnet deploy (Q4)
  11155111: {
    crowdFund: (env.VITE_SEPOLIA_CROWDFUND_ADDRESS as `0x${string}`) || ZERO,
    pledgeToken: (env.VITE_SEPOLIA_TOKEN_ADDRESS as `0x${string}`) || ZERO,
  },
};

export function addressesFor(chainId: number | undefined): DeployedAddresses | null {
  if (chainId === undefined) return null;
  const found = ADDRESSES[chainId];
  if (!found) return null;
  if (found.crowdFund === ZERO || found.pledgeToken === ZERO) return null; // not deployed on this chain yet
  return found;
}

export function isZeroAddress(a: string | undefined): boolean {
  return !a || a.toLowerCase() === ZERO;
}
