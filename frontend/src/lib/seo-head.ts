// frontend/src/lib/seo-head.ts
export function noindexHead(title?: string) {
  const meta: Array<Record<string, string>> = [
    { name: "robots", content: "noindex, nofollow" },
  ];
  if (title) meta.unshift({ title });
  return { meta };
}