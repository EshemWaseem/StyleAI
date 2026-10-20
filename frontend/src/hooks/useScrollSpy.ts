// hooks/useScrollSpy.ts
//      ==
// Tracks which section is currently in view based on scroll.
// Returns the id of the active section.
//      ==
import { useEffect, useState } from "react";

export function useScrollSpy(
  sectionIds: string[],
  options?: { offset?: number; rootMargin?: string }
): string {
  const [activeId, setActiveId] = useState<string>(
    sectionIds[0] ?? ""
  );

  useEffect(() => {
    if (typeof window === "undefined" || sectionIds.length === 0) return;

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const offset = options?.offset ?? 120; // navbar height + buffer

    function update() {
      const scrollY = window.scrollY;
      const viewportMid = scrollY + offset + 100;

      // If at very top → first section
      if (scrollY < 80) {
        setActiveId(sectionIds[0]);
        return;
      }

      // If at very bottom → last section
      const atBottom =
        window.innerHeight + scrollY >=
        document.documentElement.scrollHeight - 40;
      if (atBottom) {
        setActiveId(sectionIds[sectionIds.length - 1]);
        return;
      }

      // Otherwise: find the section whose top is closest above viewportMid
      let current = sectionIds[0];
      for (const el of elements) {
        const top = el.getBoundingClientRect().top + scrollY;
        if (top <= viewportMid) {
          current = el.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sectionIds.join(","), options?.offset]);

  return activeId;
}
