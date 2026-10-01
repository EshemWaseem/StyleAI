// lib/payments/stripe/redirect.ts
export function redirectToStripe(url: string) {
  window.location.href = url;
}