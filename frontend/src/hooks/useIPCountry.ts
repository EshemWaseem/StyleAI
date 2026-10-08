// hooks/useIPCountry.ts
import { useEffect, useState } from "react";

/**
 * Detect user's country from IP.
 * Tries multiple free APIs (no key) — first success wins.
 * No caching — fresh detection on every mount.
 */

async function tryFetch(url: string, extract: (d: any) => string | undefined) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    const code = extract(d);
    return code ? String(code).toUpperCase() : null;
  } catch {
    return null;
  }
}

async function detectIso2(): Promise<string | null> {
  // 1) ipwho.is — reliable, no key
  const a = await tryFetch("https://ipwho.is/", (d) =>
    d?.success === false ? undefined : d?.country_code
  );
  if (a) return a;

  // 2) ipapi.co
  const b = await tryFetch("https://ipapi.co/json/", (d) => d?.country_code);
  if (b) return b;

  // 3) ipinfo.io
  const c = await tryFetch("https://ipinfo.io/json/", (d) => d?.country);
  if (c) return c;

  // 4) cloudflare trace (XML style — fallback fetch)
  try {
    const r = await fetch("https://www.cloudflare.com/cdn-cgi/trace", {
      cache: "no-store",
    });
    if (r.ok) {
      const text = await r.text();
      const m = text.match(/^loc=([A-Z]{2})/m);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function useIPCountry() {
  const [iso2, setIso2] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    console.log("[ip] detecting…");

    detectIso2().then((code) => {
      if (cancelled) return;
      if (code) {
        console.log("[ip] detected:", code);
        setIso2(code);
      } else {
        console.warn("[ip] all APIs failed — no IP detection");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return iso2;
}