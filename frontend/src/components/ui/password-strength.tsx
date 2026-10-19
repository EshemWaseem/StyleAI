// components/ui/password-strength.tsx
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckResult {
  label: string;
  passed: boolean;
}

interface PasswordStrengthProps {
  password: string;
  showChecks?: boolean;
  className?: string;
}

export function evaluatePassword(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  barColor: string;
  checks: CheckResult[];
} {
  const checks: CheckResult[] = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /[0-9]/.test(password) },
    { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (password.length === 0) score = 0;
  else if (password.length < 6) score = 1;
  else if (passedCount <= 2) score = 1;
  else if (passedCount === 3) score = 2;
  else if (passedCount === 4) score = 3;
  else score = 4;

  const labels = ["Too short", "Weak", "Fair", "Strong", "Excellent"];
  const colors = [
    "bg-muted",
    "bg-destructive",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-500",
  ];

  return {
    score,
    label: labels[score],
    barColor: colors[score],
    checks,
  };
}

export function PasswordStrength({
  password,
  showChecks = true,
  className,
}: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, barColor, checks } = evaluatePassword(password);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              i <= score ? barColor : "bg-muted"
            )}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Password strength:{" "}
        <span
          className={cn(
            "font-medium",
            score === 1 && "text-destructive",
            score === 2 && "text-amber-600 dark:text-amber-400",
            score >= 3 && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {label}
        </span>
      </p>

      {showChecks && (
        <ul className="space-y-1 pt-1">
          {checks.map((c) => (
            <li
              key={c.label}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors",
                c.passed
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              )}
            >
              {c.passed ? (
                <Check className="size-3 shrink-0" aria-hidden="true" />
              ) : (
                <X className="size-3 shrink-0" aria-hidden="true" />
              )}
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}