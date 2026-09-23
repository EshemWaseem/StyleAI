import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageItem {
  id: string;
  url: string;
}

interface Props {
  images: ImageItem[];
  alt?: string;
  className?: string;
  aspect?: string;          // e.g. "aspect-[3/4]"
  showThumbnails?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  rounded?: string;         // e.g. "rounded-xl"
  size?: "sm" | "md" | "lg";
}

export function ProductImageSlider({
  images,
  alt = "",
  className,
  aspect = "aspect-[3/4]",
  showThumbnails = false,
  showDots = true,
  showCounter = true,
  rounded = "rounded-xl",
  size = "md",
}: Props) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total]
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total]
  );

  // Keyboard nav (only when slider is focused/hovered)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || total <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [prev, next, total]);

  // Reset index when images change
  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [total, index]);

  // Touch swipe
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) prev();
      else next();
    }
    touchStartX.current = null;
  }

  // Size tokens
  const btnSize = size === "sm" ? "size-7" : size === "lg" ? "size-11" : "size-9";
  const iconSize = size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";

  if (total === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-muted/30 text-muted-foreground",
          aspect,
          rounded,
          "border border-border",
          className
        )}
      >
        <div className="flex flex-col items-center gap-1.5">
          <ImageIcon className="size-5 opacity-50" />
          <span className="text-[10px]">No image</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* MAIN IMAGE */}
      <div
        ref={containerRef}
        tabIndex={0}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cn(
          "group relative overflow-hidden border border-border bg-muted/10 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          aspect,
          rounded
        )}
      >
        {/* Images — CSS opacity swap for instant switching */}
        {images.map((img, i) => (
          <img
            key={img.id}
            src={img.url}
            alt={i === index ? alt : ""}
            loading={i === 0 ? "eager" : "lazy"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          />
        ))}

        {total > 1 && (
          <>
            {/* ARROWS */}
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition-all",
                btnSize,
                "opacity-0 group-hover:opacity-100 focus:opacity-100"
              )}
            >
              <ChevronLeft className={iconSize} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur transition-all",
                btnSize,
                "opacity-0 group-hover:opacity-100 focus:opacity-100"
              )}
            >
              <ChevronRight className={iconSize} />
            </button>

            {/* DOTS */}
            {showDots && (
              <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/70 px-2 py-1 backdrop-blur">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to image ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-4 bg-foreground" : "w-1.5 bg-foreground/40 hover:bg-foreground/60"
                    )}
                  />
                ))}
              </div>
            )}

            {/* COUNTER */}
            {showCounter && (
              <div className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
                {index + 1} / {total}
              </div>
            )}
          </>
        )}
      </div>

      {/* THUMBNAILS */}
      {showThumbnails && total > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-md border-2 transition-opacity",
                i === index
                  ? "border-accent opacity-100"
                  : "border-border opacity-50 hover:opacity-90"
              )}
            >
              <img
                src={img.url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}