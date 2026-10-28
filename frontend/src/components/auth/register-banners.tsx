// components/auth/register-banners.tsx
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export type RegisterBannerState = {
  error: string;
  success: string;
  pendingApprovalMessage: string;
};

export function RegisterBanners({ state }: { state: RegisterBannerState }) {
  const { error, success, pendingApprovalMessage } = state;

  return (
    <>
      {pendingApprovalMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <span className="mt-0.5 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
          <span>{pendingApprovalMessage}</span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
    </>
  );
}