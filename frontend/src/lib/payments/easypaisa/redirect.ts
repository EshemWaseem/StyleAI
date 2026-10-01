// lib/payments/easypaisa/redirect.ts
export function redirectToEasypaisa(session: { url: string; fields: Record<string, string> }) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = session.url;

  for (const [key, value] of Object.entries(session.fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}