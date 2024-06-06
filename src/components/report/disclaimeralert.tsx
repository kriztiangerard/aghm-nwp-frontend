import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDisclaimerBlock } from "@/lib/disclaimers";
import { cn } from "@/lib/utils";

interface DisclaimerAlertProps {
  /** EngineResult.generatedAt: the same value shown on the Comparison page and stamped into exports. */
  generatedAt: string;
  className?: string;
}

/**
 * Always-visible disclaimer for the Final Report page (AC2, AC3).
 * Render it directly above the PDF/CSV download buttons. Intentionally has no
 * collapse, tooltip, or link behavior.
 */
export function DisclaimerAlert({ generatedAt, className }: DisclaimerAlertProps) {
  const { title, generatedAtLine, paragraphs } = getDisclaimerBlock(generatedAt);

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
        {paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}