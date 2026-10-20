export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return "0";
  const n = Number(num);
  if (isNaN(n)) return "0";
  
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + "K";
  return n.toString();
}

export function formatFollowers(n: number | string | null | undefined): string {
  return formatNumber(n);
}

export function formatEngagement(rate: number): string {
  if (rate == null || isNaN(rate)) return "0%";
  return `${(rate * 100).toFixed(2)}%`;
}

export function influencerInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}