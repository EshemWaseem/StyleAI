// lib/seo-head.ts
export function noindexHead(title?: string) {
  return {
    meta: [
      ...(title ? [{ title }] : []),
      { name: "robots", content: "noindex, nofollow" },
    ],
  };
}