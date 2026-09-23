import type { Abi } from 'viem';
import crowdFundJson from './CrowdFund.json';
import mockTokenJson from './MockToken.json';

/** Exported ABIs (tasks T015) — the JSON files are forge-built ABI arrays */
export const crowdFundAbi = crowdFundJson as unknown as Abi;
export const mockTokenAbi = mockTokenJson as unknown as Abi;
