// components/payments/PaymentMethodPicker.tsx
import { CreditCard, Wallet, Banknote, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

// Assuming this type comes from your backend/types
export type PaymentProvider = 'STRIPE' | 'JAZZCASH' | 'EASYPAISA' | 'COD' | 'WALLET';

const META: Record<PaymentProvider, { label: string; icon: any; subtitle: string }> = {
  STRIPE:    { label: 'Card (Stripe)',    icon: CreditCard,  subtitle: 'Visa, Mastercard, Amex' },
  JAZZCASH:  { label: 'JazzCash',         icon: Smartphone,  subtitle: 'Mobile wallet — Pakistan' },
  EASYPAISA: { label: 'Easypaisa',        icon: Wallet,      subtitle: 'Mobile wallet — Pakistan' },
  COD:       { label: 'Cash on Delivery', icon: Banknote,    subtitle: 'Pay when it arrives' },
  WALLET:    { label: 'StyleAI Wallet',   icon: Wallet,      subtitle: 'Use your balance' },
};

interface Props {
  value: PaymentProvider | null;
  onChange: (p: PaymentProvider) => void;
  allowed: PaymentProvider[];
  disabled?: boolean;
}

export function PaymentMethodPicker({ value, onChange, allowed, disabled }: Props) {
  if (!allowed.length) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
        No payment methods are currently available. Please contact support.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {allowed.map((p) => {
        const meta = META[p];
        const Icon = meta.icon;
        const selected = value === p;
        return (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onClick={() => onChange(p)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4 text-left transition',
              selected
                ? 'border-accent ring-1 ring-accent bg-accent/5'
                : 'border-border hover:border-accent/40',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon className={cn("mt-0.5 size-5", selected ? "text-accent" : "text-muted-foreground")} />
            <div className="flex-1">
              <div className="text-sm font-medium">{meta.label}</div>
              <div className="text-xs text-muted-foreground">{meta.subtitle}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}