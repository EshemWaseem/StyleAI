// lib/billing/format.ts
// ======================================================
// Currency + plan formatting helpers
// ======================================================

// Approx FX — matches backend .env USD_PKR_RATE
const USD_PKR = 278;

/**
 * Format a price. If currency is PKR, also show approximate USD.
 */
export function formatPrice(
  amount: number | null | undefined,
  currency: string,
  opts: { showUsdEquivalent?: boolean; per?: 'mo' | 'yr' } = {}
): string {
  if (amount == null) return '—';
  if (amount === 0) return 'Free';

  const per = opts.per ? `/${opts.per}` : '';

  if (currency === 'PKR') {
    const pkr = `PKR ${amount.toLocaleString('en-PK')}${per}`;
    if (opts.showUsdEquivalent) {
      const usd = Math.round(amount / USD_PKR);
      return `${pkr} · $${usd}${per}`;
    }
    return pkr;
  }

  return `${currency} ${amount.toLocaleString()}${per}`;
}

/**
 * Short USD equivalent only (for badges/subtitles).
 */
export function usdEquivalent(
  amount: number | null | undefined,
  currency: string
): string | null {
  if (amount == null || amount === 0) return null;
  if (currency !== 'PKR') return null;
  return `$${Math.round(amount / USD_PKR)}`;
}

/**
 * Take rate % formatter.
 */
export function formatTakeRate(rate: number | null | undefined): string | null {
  if (rate == null || rate === 0) return null;
  return `${(rate * 100).toFixed(1)}%`;
}