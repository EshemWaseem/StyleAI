import { ArrowUpRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid gap-5 border-b border-border pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</p>
  );
}

export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-6 shadow-soft", className)}>
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  trend = "up",
  note,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  note?: string;
}) {
  const Icon = trend === "down" ? TrendingDown : TrendingUp;
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl font-medium tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              trend === "down" ? "text-destructive" : "text-success",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {delta}
          </span>
        ) : null}
        {note ? <span className="text-muted-foreground">{note}</span> : null}
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Active" || status === "Complete" || status === "Indexed"
      ? "bg-success/10 text-success"
      : status === "Draft" || status === "Pending" || status === "Invited"
        ? "bg-muted text-muted-foreground"
        : "bg-warning/15 text-warning";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium", tone)}>
      {status}
    </span>
  );
}

export function ScoreRing({ score, size = 96, label = "Match" }: { score: number; size?: number; label?: string }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${score} percent ${label}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-border" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="score-ring stroke-accent"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-2xl font-medium leading-none tabular-nums">{score}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-muted">
        <span className="score-bar block h-1 rounded-full bg-foreground" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function InsightCard({
  title,
  reason,
  confidence,
  action,
}: {
  title: string;
  reason: string;
  confidence: number;
  action: string;
}) {
  return (
    <article className="rounded-xl border border-accent/25 bg-brand-soft p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">StyleAI insight</span>
      </div>
      <h3 className="mt-4 font-display text-lg font-medium leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{reason}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Confidence {confidence}% · AI estimate, not guaranteed</span>
        <Button variant="outline" size="sm" className="bg-card">
          {action}
          <ArrowUpRight />
        </Button>
      </div>
    </article>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
      <h3 className="font-display text-xl font-medium">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AIProgress({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                done && "border-success bg-success text-primary-foreground",
                active && "border-accent text-accent",
                !done && !active && "border-border text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {done ? "✓" : active ? "→" : ""}
            </span>
            <span className={cn(done ? "text-muted-foreground" : active ? "font-medium" : "text-muted-foreground/60")}>
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
