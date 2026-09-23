/** Amount/address/time formatting (FR-004) — correct decimals, readable large numbers */

export function formatAmount(value: bigint, decimals = 18, maxFraction = 4): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const intPart = abs / base;
  const fracPart = abs % base;

  const intStr = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let fracStr = '';
  if (fracPart > 0n && maxFraction > 0) {
    fracStr = fracPart.toString().padStart(decimals, '0').slice(0, maxFraction);
    fracStr = fracStr.replace(/0+$/, '');
  }

  const body = fracStr ? `${intStr}.${fracStr}` : intStr;
  return negative ? `-${body}` : body;
}

/** Readable compact form for big display numbers: 1.23M, 45.6K */
export function formatCompact(value: bigint, decimals = 18): string {
  const base = 10n ** BigInt(decimals);
  const whole = value / base; // integer tokens
  const n = Number(whole);
  if (n < 1000) return formatAmount(value, decimals, 2);
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const scaled = n / size;
      return `${scaled.toFixed(2).replace(/\.?0+$/, '')}${suffix}`;
    }
  }
  return formatAmount(value, decimals, 2);
}

/** Progress percentage; may exceed 100 (over-funding edge case) */
export function progressPct(pledged: bigint, goal: bigint): number {
  if (goal <= 0n) return 0;
  const ratio = (pledged * 10000n) / goal;
  return Number(ratio) / 100;
}

/** Shortened address with full value retrievable (rendered via title attr) */
export function shortenAddress(address: string): string {
  if (!address || address.length < 12) return address || '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Card timing label: "Starts in …" / "Ends in …" / "Ended <date>" */
export function formatTimingLabel(startAt: number, endAt: number, now: number): string {
  if (now < startAt) return `Starts in ${formatDuration(startAt - now)}`;
  if (now <= endAt) return `Ends in ${formatDuration(endAt - now)}`;
  const ended = new Date(endAt * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return `Ended ${ended}`;
}

export function formatDateTime(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function clockLabel(date: Date = new Date()): string {
  return date.toLocaleTimeString(undefined, { hour12: false });
}

/** Parse user-entered token amount to bigint; returns null when invalid */
export function parseAmount(input: string, decimals = 18): bigint | null {
  const trimmed = input.trim();
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '' || trimmed === '.') return null;
  const [intRaw = '0', fracRaw = ''] = trimmed.split('.');
  if (fracRaw.length > decimals) return null;
  const whole = BigInt(intRaw === '' ? '0' : intRaw);
  // Pad the fraction to full precision: "12.5" → 12.5 * 10^18
  const frac = fracRaw === '' ? 0n : BigInt(fracRaw.padEnd(decimals, '0'));
  return whole * 10n ** BigInt(decimals) + frac;
}
