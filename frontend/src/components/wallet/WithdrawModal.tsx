import { useState } from "react";
import { Loader2, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withdrawalsApi } from "@/lib/wallet";

interface Props {
  availableBalance: number;
  currency: string;
  minAmount: number;
  onClose: () => void;
  onSubmitted: () => void;
}

export function WithdrawModal({
  availableBalance, currency, minAmount, onClose, onSubmitted,
}: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bank" | "paypal" | "stripe">("bank");
  const [destination, setDestination] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setError("Enter a valid amount");
    if (n < minAmount) return setError(`Minimum is ${currency} ${minAmount}`);
    if (n > availableBalance) return setError(`Max is ${currency} ${availableBalance.toFixed(2)}`);
    if (!destination.trim()) return setError("Enter a destination");

    setSaving(true);
    try {
      await withdrawalsApi.request({
        amount: n,
        method,
        destination: destination.trim(),
        note: note.trim() || undefined,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="my-8 w-full max-w-md rounded-xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-medium">Withdraw funds</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving}>
            <X />
          </Button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            Available: <strong className="text-foreground">{currency} {availableBalance.toFixed(2)}</strong>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency})</Label>
            <Input
              id="amount" type="number" min={minAmount} step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${minAmount}`}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Method</Label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="bank">Bank transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">
              {method === "paypal" ? "PayPal email" : "Account / email"}
            </Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={method === "paypal" ? "you@example.com" : "IBAN / account number"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <textarea
              id="note" rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowUpRight className="mr-2 size-4" />}
            Request withdrawal
          </Button>
        </div>
      </form>
    </div>
  );
}