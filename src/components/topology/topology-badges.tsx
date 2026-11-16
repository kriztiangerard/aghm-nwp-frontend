import type { CSSProperties } from "react";
import { Link2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * NWP-TOPO-003: node badges (integrated firewall, integrated controller,
 * integrated-in-gateway, sunsetting). Colours come from topology-theme.css.
 *
 * Accessibility: badge text is always --topo-badge-text on the opaque
 * --topo-badge-bg (about 19:1). The status colour appears only on the border
 * and icon, which are not text and need just 3:1.
 *
 * shadcn Tooltip is not installed, so the longer explanation goes in `title`.
 * The visible text still makes sense without it.
 */

const BADGE_BASE =
  "h-5 gap-1 rounded-sm border-[1.5px] px-1.5 text-[10px] font-semibold leading-none [&>svg]:size-3";

function badgeStyle(accent: string): CSSProperties {
  return {
    borderColor: accent,
    color: "var(--topo-badge-text)",
    backgroundColor: "var(--topo-badge-bg)",
  };
}

const INTEGRATED = "var(--topo-badge-integrated)";
const SUNSETTING = "var(--topo-badge-sunsetting)";

const INTEGRATED_FUNCTION_TEXT: Record<string, string> = {
  firewall: "Integrated firewall",
  controller: "Integrated controller",
};

/** On the gateway: a function this gateway also performs (AC2, AC4). */
export function IntegratedFunctionBadge({ fn }: { fn: string }) {
  const text = INTEGRATED_FUNCTION_TEXT[fn] ?? `Integrated ${fn}`;

  return (
    <Badge
      variant="outline"
      className={BADGE_BASE}
      style={badgeStyle(INTEGRATED)}
      title={`This gateway also performs the ${fn} function; no separate ${fn} device is needed.`}
      data-testid={`badge-integrated-${fn}`}
    >
      <Link2 aria-hidden="true" style={{ color: INTEGRATED }} />
      {text}
    </Badge>
  );
}

/** On the firewall: it runs on the gateway rather than as its own box (AC2). */
export function IntegratedWithBadge() {
  return (
    <Badge
      variant="outline"
      className={BADGE_BASE}
      style={badgeStyle(INTEGRATED)}
      title="The firewall is built into the gateway listed here. It is shown separately to make the security layer visible."
      data-testid="badge-integrated-with-gateway"
    >
      <Link2 aria-hidden="true" style={{ color: INTEGRATED }} />
      Integrated in gateway
    </Badge>
  );
}

/**
 * AC8: lifecycle advisory for SUNSETTING devices.
 * On cards it spans the card width and may wrap to two lines, because the full
 * advice does not fit on one line of a narrow card. layout.ts reserves
 * SUNSETTING_BADGE_HEIGHT for it. The legend passes a className to keep it on one line.
 */
export function SunsettingBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        BADGE_BASE,
        "h-auto w-full whitespace-normal py-1 text-center leading-tight",
        className,
      )}
      style={badgeStyle(SUNSETTING)}
      title="This model is being phased out by the vendor. Confirm availability with a distributor before purchase."
      data-testid="badge-sunsetting"
    >
      <TriangleAlert aria-hidden="true" style={{ color: SUNSETTING }} />
      Sunsetting · confirm availability
    </Badge>
  );
}