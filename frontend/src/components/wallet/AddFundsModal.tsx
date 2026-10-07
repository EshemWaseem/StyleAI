// components/wallet/AddFundsModal.tsx
import { useState } from "react";
import { X, Loader2, AlertCircle, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { walletApi } from "@/lib/wallet";

const QUICK_AMOUNTS = [5000, 15000, 50000, 100000];
const MIN_AMOUNT = 500;
const MAX_AMOUNT = 2_000_000;

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddFundsModal({ onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (numericAmount < MIN_AMOUNT) {
      setError(`Minimum amount is PKR ${MIN_AMOUNT.toLocaleString()}`);
      return;
    }
    if (numericAmount > MAX_AMOUNT) {
      setError(`Maximum amount is PKR ${MAX_AMOUNT.toLocaleString()}`);
      return;
    }

    setLoading(true);
    try {
      const res = await walletApi.topUp({
        amount: numericAmount,
        provider: "STRIPE",
      });

      // Redirect to Stripe checkout
      if (res.session?.url) {
        window.location.href = res.session.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-accent" />
            <h3 className="text-sm font-medium">Add funds to wallet</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            disabled={loading}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              disabled={loading}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Min PKR {MIN_AMOUNT.toLocaleString()} · Max PKR {MAX_AMOUNT.toLocaleString()}
            </p>
          </div>

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(String(amt))}
                disabled={loading}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                +{amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Payment method</Label>
            <div className="flex items-center gap-2 rounded-md border border-accent bg-accent/5 px-3 py-2.5 text-sm">
              <CreditCard className="size-4 text-accent" />
              <span className="flex-1 font-medium">Stripe</span>
              <span className="text-[10px] uppercase text-accent">Selected</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Secure payment via card. Amount will be charged in USD at current exchange rate.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !numericAmount}>
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Redirecting…
                </>
              ) : (
                "Continue to payment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}