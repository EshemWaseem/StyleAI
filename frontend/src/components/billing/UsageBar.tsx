// components/billing/UsageBar.tsx
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  used: number;
  limit: number | null | undefined;
  hint?: string;
}

export function UsageBar({ label, used, limit, hint }: Props) {
  const unlimited = limit == null;
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  const near = !unlimited && pct >= 80;
  const full = !unlimited && used >= limit;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          'tabular-nums font-medium',
          full && 'text-destructive',
          near && !full && 'text-amber-500',
          !near && 'text-foreground',
        )}>
          {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        {!unlimited && (
          <div
            className={cn(
              'h-full rounded-full transition-all',
              full ? 'bg-destructive' : near ? 'bg-amber-500' : 'bg-accent',
            )}
            style={{ width: `${pct}%` }}
          />
        )}
        {unlimited && <div className="h-full w-full rounded-full bg-emerald-500/40" />}
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}