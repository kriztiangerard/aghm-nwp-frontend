import { useId, useState } from "react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDisclaimerBlock } from "@/lib/disclaimers";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/components/comparison/use-is-mobile";

interface DisclaimerAlertProps {
  /** EngineResult.generatedAt: the same value shown on the Comparison page and stamped into exports. */
  generatedAt: string;
  className?: string;
}

/**
 * Disclaimer for the Final Report page (AC2, AC3).
 * Always fully visible on wider screens and in print. On phone widths the two
 * paragraphs start collapsed; the title and generated-at line stay visible.
 */
export function DisclaimerAlert({ generatedAt, className }: DisclaimerAlertProps) {
  const { title, generatedAtLine, paragraphs } = getDisclaimerBlock(generatedAt);
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const detailsId = useId();
  const isCollapsed = isMobile && !isOpen;

  return (
    // Same amber treatment as the warnings on the comparison page. The mix keeps
    // the box opaque so the page grid never shows through it.
    <Alert
      className={cn(
        "rounded-md border-amber-500/50 bg-[color-mix(in_oklab,var(--color-amber-500)_10%,var(--background))] p-3 text-sm has-[>svg]:gap-x-2",
        className,
      )}
    >
      <TriangleAlert
        className="h-4 w-4 text-amber-800 dark:text-amber-300"
        aria-hidden="true"
      />
      <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        {title}
      </AlertTitle>
      <AlertDescription className="text-sm [&_p:not(:last-child)]:mb-2">
        <p className="font-medium">{generatedAtLine}</p>
        {/* Hidden with CSS, not removed, so a printed page keeps the full text. */}
        <div
          id={detailsId}
          className={cn(
            "[&_p:not(:last-child)]:mb-2",
            isCollapsed && "hidden print:block",
          )}
        >
          {paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>
        {isMobile && (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={detailsId}
            onClick={() => setIsOpen((open) => !open)}
            className="flex min-h-9 cursor-pointer items-center gap-1 font-semibold text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden dark:text-amber-300"
          >
            {isOpen ? "Hide details" : "Show details"}
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 transition-transform", isOpen && "rotate-180")}
            />
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}