export function formatFollowers(n: number): string {
  if (!n || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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