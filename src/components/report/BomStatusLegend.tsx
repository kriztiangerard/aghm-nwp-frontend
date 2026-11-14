import { useEffect, useRef, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function BomStatusLegend() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const entries = [
    { label: "Synced", description: "Price sourced from distributor" },
    { label: "Manual", description: "Price entered manually" },
    { label: "Generic", description: "Generic component" },
    { label: "Stale", description: "Price may be out of date" },
    { label: "Sunsetting", description: "Device approaching end-of-life" },
  ];

  return (
    <div
      className="relative inline-flex"
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="BOM status legend"
        aria-expanded={open}
        aria-controls="bom-status-legend"
        onClick={() => setOpen((previous) => !previous)}
        className="inline-flex size-6 items-center justify-center rounded-full bg-transparent text-muted-foreground shadow-none transition-all hover:bg-muted hover:shadow-sm focus-visible:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          id="bom-status-legend"
          className="absolute left-0 top-full z-50 mt-2 w-[min(90vw,390px)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
        >
          <h3 className="mb-4 text-base font-semibold">Legend</h3>

          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.label}
                className="flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <Badge
                  variant={
                    entry.label === "Synced" || entry.label === "Manual"
                      ? "secondary"
                      : "outline"
                  }
                  className={
                    entry.label === "Stale" || entry.label === "Sunsetting"
                      ? "gap-1 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
                      : ""
                  }
                >
                  {entry.label === "Sunsetting" && (
                    <TriangleAlert className="size-3" aria-hidden="true" />
                  )}
                  {entry.label}
                </Badge>

                <span className="text-xs text-muted-foreground">
                  {entry.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
