import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDisclaimerBlock } from "@/lib/disclaimers";

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
    <Alert className={className}>
      <TriangleAlert className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="font-medium">{generatedAtLine}</p>
        {paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}