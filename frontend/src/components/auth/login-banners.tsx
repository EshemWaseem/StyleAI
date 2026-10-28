// components/auth/login-banners.tsx
import { AlertTriangle, Lock, Mail } from "lucide-react";

export type LoginBannerState = {
  pendingNotice: string;
  emailNotVerified: { maskedEmail: string } | null;
  resendSent: boolean;
  resending: boolean;
  isLocked: boolean;
  lockMessage: string;
  countdown: number;
  error: string;
  attemptsRemaining: number | null;
  captchaRequired: boolean;
};

function formatCountdown(secs: number): string {
  if (secs <= 0) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function LoginBanners({
  state,
  onResendVerification,
}: {
  state: LoginBannerState;
  onResendVerification: () => void;
}) {
  const {
    pendingNotice,
    emailNotVerified,
    resendSent,
    resending,
    isLocked,
    lockMessage,
    countdown,
    error,
    attemptsRemaining,
    captchaRequired,
  } = state;

  return (
    <>
      {pendingNotice && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>{pendingNotice}</span>
        </div>
      )}

      {emailNotVerified && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 size-3.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Verify your email</div>
              <div className="mt-0.5 text-[11px] opacity-90">
                We sent a verification link to{" "}
                <span className="font-medium">{emailNotVerified.maskedEmail}</span>.
                Check your inbox (and spam folder).
              </div>
            </div>
          </div>
          {resendSent ? (
            <div className="text-[11px] opacity-90">
              ✓ New verification email sent. Please check your inbox.
            </div>
          ) : (
            <button
              type="button"
              onClick={onResendVerification}
              disabled={resending}
              className="self-start rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-medium hover:bg-amber-500/30 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
          )}
        </div>
      )}

      {isLocked && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">
              {lockMessage || "Account temporarily locked"}
            </div>
            <div className="mt-0.5 text-[11px] opacity-80">
              Try again in{" "}
              <span className="tabular-nums font-medium">
                {formatCountdown(countdown)}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && !isLocked && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}

      {!isLocked && attemptsRemaining !== null && attemptsRemaining > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Warning: {attemptsRemaining} attempt
            {attemptsRemaining === 1 ? "" : "s"} remaining before your account is
            temporarily locked.
          </span>
        </div>
      )}

      {captchaRequired && !isLocked && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Security check will be required on next attempt.
        </div>
      )}
    </>
  );
}