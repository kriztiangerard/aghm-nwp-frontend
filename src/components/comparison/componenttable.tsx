import React, { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, Cpu, Info } from "lucide-react";
import { formatDate, formatPrice } from "./format";
import { formatFirewallNote } from "@/lib/report/format-labels";
import type { BomLineItem } from "./types";

interface ComponentTableProps {
  bom: BomLineItem[];
  currency: string;
}

const SOURCE_LABEL = {
  synchronized: "Synced",
  manual: "Manual",
} as const;

const WARN = "text-amber-700 dark:text-amber-400";

export const ComponentTable: React.FC<ComponentTableProps> = ({
  bom,
  currency,
}) => {
  const tableId = useId();
  const legendId = useId();

  const totalUnits = bom.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const firewallNote = formatFirewallNote(bom);

  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [openStaleTooltip, setOpenStaleTooltip] = useState<
    string | null
  >(null);

  const legendButtonRef = useRef<HTMLButtonElement>(null);
  const [legendPosition, setLegendPosition] = useState({
    left: 0,
    top: 0,
  });

  const positionLegend = () => {
    const button = legendButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const width = 288;

    setLegendPosition({
      left: Math.max(
        8,
        Math.min(
          window.innerWidth - width - 8,
          rect.right - width,
        ),
      ),
      top: rect.bottom + 6,
    });
  };

  const openLegend = () => {
    positionLegend();
    setShowLegend(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-semibold md:pointer-events-none"
            aria-expanded={mobileExpanded}
            aria-controls={tableId}
            onClick={() => setMobileExpanded((value) => !value)}
          >
            <Cpu
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span>Bill of Materials</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform md:hidden ${
                mobileExpanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          <div className="relative">
            <button
              ref={legendButtonRef}
              type="button"
              className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Show badge legend"
              aria-expanded={showLegend}
              aria-controls={showLegend ? legendId : undefined}
              onClick={() => {
                positionLegend();
                setShowLegend((value) => !value);
              }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") openLegend();
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") {
                  setShowLegend(false);
                }
              }}
              onFocus={openLegend}
              onBlur={() => setShowLegend(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setShowLegend(false);
                }
              }}
            >
              <Info className="size-4" aria-hidden="true" />
            </button>

            {showLegend &&
              createPortal(
                <div
                  id={legendId}
                  role="tooltip"
                  className="fixed z-50 w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                  style={{
                    left: legendPosition.left,
                    top: legendPosition.top,
                  }}
                >
                  <p className="mb-2 text-xs font-semibold">
                    Legend
                  </p>

                  <dl className="space-y-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <dt>
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          Synced
                        </Badge>
                      </dt>
                      <dd className="text-muted-foreground">
                        Price sourced from distributor
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt>
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          Manual
                        </Badge>
                      </dt>
                      <dd className="text-muted-foreground">
                        Price entered manually
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt>
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                        >
                          Generic
                        </Badge>
                      </dt>
                      <dd className="text-muted-foreground">
                        Generic component
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${WARN}`}
                        >
                          Stale
                        </Badge>
                      </dt>
                      <dd className="text-muted-foreground">
                        Price may be out of date
                      </dd>
                    </div>

                    <div className="flex items-center gap-2">
                      <dt>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${WARN}`}
                        >
                          <AlertTriangle aria-hidden="true" />
                          <span>Sunsetting</span>
                        </Badge>
                      </dt>
                      <dd className="text-muted-foreground">
                        Device approaching end-of-life
                      </dd>
                    </div>
                  </dl>
                </div>,
                document.body,
              )}
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          {totalUnits} total units
        </span>
      </div>

      <div
        id={tableId}
        className={`overflow-x-auto rounded-md border ${
          mobileExpanded ? "block" : "hidden"
        } md:block`}
      >
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-xs">
                Category
              </TableHead>
              <TableHead className="min-w-[220px] text-xs">
                Model
              </TableHead>
              <TableHead className="w-14 text-center text-xs">
                Qty
              </TableHead>
              <TableHead className="min-w-[130px] text-right text-xs">
                Unit price
              </TableHead>
              <TableHead className="text-right text-xs">
                Line total
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {bom.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No hardware items were returned for this plan.
                </TableCell>
              </TableRow>
            ) : (
              bom.map((item) => {
                const itemKey = `${item.category}-${item.sku}`;
                const unavailable = item.unitPrice === null;

                return (
                  <TableRow key={itemKey}>
                    <TableCell className="py-2.5 align-top text-xs text-muted-foreground">
                      {item.category}
                    </TableCell>

                    <TableCell className="whitespace-normal py-2.5 align-top">
                      <div className="text-xs font-medium text-foreground">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {item.sku}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.isGeneric && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            Generic
                          </Badge>
                        )}

                        {item.status === "SUNSETTING" && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${WARN}`}
                          >
                            <AlertTriangle aria-hidden="true" />
                            <span>Sunsetting</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-2.5 text-center align-top text-xs font-medium">
                      {item.quantity}
                    </TableCell>

                    <TableCell className="whitespace-normal py-2.5 text-right align-top">
                      <div
                        className={`text-xs ${
                          unavailable
                            ? `font-medium ${WARN}`
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatPrice(item.unitPrice, currency)}
                      </div>

                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {SOURCE_LABEL[item.priceSource]}
                        </Badge>

                        {item.isStale &&
                          (item.priceUpdatedAt ? (
                            <span
                              className="relative inline-flex"
                              onMouseEnter={() =>
                                setOpenStaleTooltip(itemKey)
                              }
                              onMouseLeave={() =>
                                setOpenStaleTooltip(null)
                              }
                            >
                              <button
                                type="button"
                                className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={`Stale price for ${item.name}, last verified ${formatDate(
                                  item.priceUpdatedAt,
                                )}`}
                                onFocus={() =>
                                  setOpenStaleTooltip(itemKey)
                                }
                                onBlur={() =>
                                  setOpenStaleTooltip(null)
                                }
                                onClick={() =>
                                  setOpenStaleTooltip((current) =>
                                    current === itemKey
                                      ? null
                                      : itemKey,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    setOpenStaleTooltip(null);
                                  }
                                }}
                              >
                                <Badge
                                  variant="outline"
                                  className={`cursor-help text-[10px] ${WARN}`}
                                >
                                  Stale
                                </Badge>
                              </button>

                              {openStaleTooltip === itemKey && (
                                <span
                                  role="tooltip"
                                  className="absolute bottom-full right-0 z-20 mb-1.5 w-max max-w-48 rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-md"
                                >
                                  Last verified{" "}
                                  {formatDate(item.priceUpdatedAt)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${WARN}`}
                            >
                              Stale
                            </Badge>
                          ))}
                      </div>
                    </TableCell>

                    <TableCell
                      className={`py-2.5 text-right align-top text-xs font-semibold ${
                        unavailable ? WARN : ""
                      }`}
                    >
                      {formatPrice(item.subtotal, currency)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}

            {firewallNote && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="whitespace-normal py-2.5 text-xs text-muted-foreground"
                >
                  {firewallNote}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ComponentTable;