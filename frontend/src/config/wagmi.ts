import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { anvilChain, liveChain, SUPPORTED_CHAINS } from './chains';

/**
 * Wagmi config (research R1/R2): injected wallets only (Clarification Q2),
 * local anvil as dev target, Sepolia as public live target (Clarification Q4).
 */
export const wagmiConfig = createConfig({
  chains: [anvilChain, liveChain],
  connectors: [injected()],
  transports: {
    [anvilChain.id]: http('http://127.0.0.1:8545'),
    [liveChain.id]: http(),
  },
  ssr: false,
});

export { SUPPORTED_CHAINS };
