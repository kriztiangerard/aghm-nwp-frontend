import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}

/** The circled-chevron back link used at the top of the comparison and report pages. */
export function BackButton({ label, onClick, className }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-fit cursor-pointer items-center gap-2 rounded-full pr-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full border bg-background transition-colors group-hover:bg-muted">
        <ChevronRight className="size-4" aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}
