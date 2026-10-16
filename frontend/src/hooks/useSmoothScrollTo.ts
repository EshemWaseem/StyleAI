// hooks/useSmoothScrollTo.ts
// ======================================================
// Smooth-scrolls to a section id, accounting for sticky nav height.
// ======================================================
import { useCallback } from "react";

export function useSmoothScrollTo(navHeight = 80) {
  return useCallback(
    (id: string | null) => {
      if (typeof window === "undefined") return;

      // Top → scroll to very top
      if (!id || id === "top" || id === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const el = document.getElementById(id);
      if (!el) return;

      const top =
        el.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top, behavior: "smooth" });

      // Update URL hash without jumping
      if (history.replaceState) {
        history.replaceState(null, "", `#${id}`);
      }
    },
    [navHeight]
  );
}