// lib/payments/index.ts
export * from './types';
export { paymentsApi } from './api';
export { redirectToStripe } from './stripe/redirect';
export { redirectToJazzCash } from './jazzcash/redirect';
export { redirectToEasypaisa } from './easypaisa/redirect';

import type { CheckoutSession } from './types';
import { redirectToStripe } from './stripe/redirect';
import { redirectToJazzCash } from './jazzcash/redirect';
import { redirectToEasypaisa } from './easypaisa/redirect';

/**
 * Take a CheckoutSession from the API and drive the browser to the gateway.
 * Handles REDIRECT (Stripe) and FORM_POST (JazzCash/Easypaisa).
 */
export function executeCheckout(
  session: CheckoutSession,
  provider: 'STRIPE' | 'JAZZCASH' | 'EASYPAISA' | 'COD'
) {
  if (session.method === 'NONE') return; // COD — nothing to do

  if (session.method === 'REDIRECT' && session.url) {
    if (provider === 'STRIPE') return redirectToStripe(session.url);
    window.location.href = session.url;
    return;
  }

  if (session.method === 'FORM_POST' && session.url && session.fields) {
    if (provider === 'JAZZCASH')  return redirectToJazzCash({ url: session.url, fields: session.fields });
    if (provider === 'EASYPAISA') return redirectToEasypaisa({ url: session.url, fields: session.fields });
  }

  throw new Error('Unknown checkout session shape');
}