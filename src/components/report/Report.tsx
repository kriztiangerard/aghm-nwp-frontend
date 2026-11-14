import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { usePlanResult } from "../comparison/plan-result-context";
import { useSelectedPlan } from "../comparison/selected-plan-context";
import TopologyDiagram from "./TopologyDiagram";
import {
  buildReport,
  type ReportBomLine,
} from "@/lib/report/report-view-model";
import { buildBomCsv, downloadCsv } from "@/lib/buildBomCsv";
import { getDisclaimerBlock } from "@/lib/disclaimers";
import type { Plan } from "@/types/api-types";

function toBackendVendor(vendor: string): string {
  if (vendor === "HPE Aruba Instant On") return "Aruba Instant On";
  return vendor;
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) return "Price on request";

  return `${currency} ${value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "network-plan";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function InstallationMaterials({
  materials,
}: {
  materials: Record<string, unknown> | null;
}) {
  if (!materials) {
    return (
      <p className="text-sm text-muted-foreground">
        No installation materials summary was provided for this plan.
      </p>
    );
  }

  const items = Array.isArray(materials.items)
    ? materials.items.filter(isRecord)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {typeof materials.asOfDate === "string" && (
          <span>Pricing date: {materials.asOfDate}</span>
        )}
        {typeof materials.pricingBasis === "string" && (
          <span>Basis: {materials.pricingBasis}</span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Material</th>
                <th className="p-3">Description</th>
                <th className="p-3">Unit</th>
                <th className="p-3">Representative price</th>
                <th className="p-3">Reference</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={`${String(item.item ?? "material")}-${index}`}
                  className="border-t"
                >
                  <td className="p-3 font-medium">
                    {String(item.item ?? "—")}
                  </td>
                  <td className="p-3">
                    {String(item.description ?? "—")}
                  </td>
                  <td className="p-3">
                    {String(item.unit ?? "—")}
                  </td>
                  <td className="p-3">
                    {String(
                      item.priceDisplay ??
                        (item.representativeUnitPrice != null
                          ? item.representativeUnitPrice
                          : "Not specified"),
                    )}
                  </td>
                  <td className="p-3">
                    {typeof item.sourceUrl === "string" &&
                    item.sourceUrl.startsWith("https://") ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        View source
                      </a>
                    ) : typeof item.priceReference === "string" ? (
                      item.priceReference
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No individual installation material items were provided.
        </p>
      )}

      {typeof materials.note === "string" && (
        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          {materials.note}
        </p>
      )}
    </div>
  );
}

function HardwareList({ lines }: { lines: ReportBomLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recommended hardware items were provided.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lines.map((line, index) => (
        <article
          key={`${line.sku}-${index}`}
          className="rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-medium">{line.name}</h3>
            <span className="rounded-full bg-muted px-2 py-1 text-xs">
              Qty: {line.qty}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {line.category} · {line.vendor}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            SKU: {line.sku}
          </p>
          {line.isGeneric && (
            <p className="mt-2 text-xs text-muted-foreground">
              Generic component
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

export default function Report() {
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const navigate = useNavigate();
  const { result } = usePlanResult();
  const { choice, plan } = useSelectedPlan();

  // Generated results exist only in React memory.
  if (!result) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          reportMessage:
            "Your results are not stored. Please regenerate your network plan.",
        }}
      />
    );
  }

  if (!choice || !plan) {
    return <Navigate to="/comparison" replace />;
  }

  if (!plan.complete) {
    return <Navigate to="/comparison" replace />;
  }

  const backendVendor = toBackendVendor(choice.vendor);
  const backendPlanType = choice.tier === "Cost-Efficient" ? "CE" : "HP";

  const backendPlan = result.engineResult.plans.find(
    (candidate: Plan) =>
      candidate.vendor === backendVendor &&
      candidate.planType === backendPlanType,
  );

  if (!backendPlan || !backendPlan.complete) {
    return <Navigate to="/comparison" replace />;
  }

  const report = buildReport(
    result.engineResult,
    {
      vendor: backendPlan.vendor,
      planType: backendPlanType,
    },
    result.questionnaireData,
  );

  // The route guard and source engine plan must both confirm completeness.
  if (!report.planComplete) {
    return <Navigate to="/comparison" replace />;
  }

  const disclaimer = getDisclaimerBlock(result.engineResult.generatedAt);

  const handleCsvPreview = () => {
  setIsCsvPreviewOpen(true);
};

const handleCsvDownload = () => {
  const csv = buildBomCsv(
    backendPlan.bom,
    result.engineResult.generatedAt,
  );

  const fileName = `${safeFileName(report.project.companyName)}-${backendPlanType}-bom.csv`;

  downloadCsv(csv, fileName);
  setIsCsvPreviewOpen(false);
};

  // Interim PDF action: browser print dialog supports Save as PDF.
  // Replace this with the REPORT-006 PDF exporter when it is ready.
  const handlePdfDownload = () => {
    window.print();
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Network Planning</p>
          <h1 className="text-3xl font-bold tracking-tight">Final Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the selected network plan and its estimated equipment
            requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/comparison")}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          ← Back to comparison
        </button>
      </header>

      <section className="rounded-xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Selected vendor</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {report.selectedVendor}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.selectedPlanType === "CE"
                ? "Cost-Efficient Plan"
                : "High-Performance Plan"}
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
            Complete plan
          </span>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Project summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Company / project", report.project.companyName],
            ["Locations", report.project.locations],
            ["Floors", String(report.project.floors)],
            ["Rooms per floor", String(report.project.roomsPerFloor)],
            [
              "Floor area",
              report.project.floorArea == null
                ? "Not specified"
                : `${report.project.floorArea} m²`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 font-medium">{value || "Not specified"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Network requirements</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Requirement</th>
                <th className="p-3">Specified value</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {report.requirements.map((requirement, index) => (
                <tr
                  key={`${requirement.label}-${index}`}
                  className="border-t"
                >
                  <td className="p-3 font-medium">{requirement.label}</td>
                  <td className="p-3">{requirement.value}</td>
                  <td className="p-3 capitalize text-muted-foreground">
                    {requirement.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recommended hardware</h2>
        <HardwareList lines={report.hardware} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Network topology</h2>
        <div className="rounded-xl border p-4">
          <TopologyDiagram topology={report.topology} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Network Equipment BOM</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Category / SKU</th>
                <th className="p-3">Device</th>
                <th className="p-3">Vendor</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit price</th>
                <th className="p-3 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {report.bom.lines.map((line, index) => (
                <tr
                  key={`${line.sku}-${index}`}
                  className="border-t"
                >
                  <td className="p-3">
                    <div>{line.category}</div>
                    <div className="text-xs text-muted-foreground">
                      {line.sku}
                    </div>
                  </td>
                  <td className="p-3">{line.name}</td>
                  <td className="p-3">{line.vendor}</td>
                  <td className="p-3 text-right">{line.qty}</td>
                  <td className="p-3 text-right">
                    {formatMoney(line.unitPrice, report.bom.currency)}
                  </td>
                  <td className="p-3 text-right">
                    {formatMoney(line.lineTotal, report.bom.currency)}
                  </td>
                </tr>
              ))}
              {report.bom.lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    No BOM line items were provided.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t bg-muted/50">
              <tr>
                <td colSpan={5} className="p-3 text-right font-semibold">
                  {report.bom.totalIsPartial ? "Total (partial)" : "Total"}
                </td>
                <td className="p-3 text-right font-semibold">
                  {formatMoney(report.bom.total, report.bom.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {report.bom.totalIsPartial && (
          <p className="text-sm text-muted-foreground">
            Some equipment prices are unavailable. The displayed total
            includes priced items only.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Installation Materials Summary
        </h2>
        <div className="rounded-xl border p-4">
          <InstallationMaterials materials={report.installationMaterials} />
        </div>
      </section>

      {(report.assumptions.length > 0 ||
        report.flags.length > 0 ||
        report.limitations.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Assumptions and planning notes
          </h2>

          {report.assumptions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Assumptions</h3>
              {report.assumptions.map((item, index) => (
                <div
                  key={`${item.field}-${index}`}
                  className="rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">{item.field}: {item.value}</p>
                  <p className="mt-1 text-muted-foreground">{item.reason}</p>
                </div>
              ))}
            </div>
          )}

          {report.flags.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Engine flags</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {report.flags.map((flag, index) => (
                  <li key={`${flag}-${index}`}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {report.limitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Limitations</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {report.limitations.map((limitation, index) => (
                  <li key={index}>{limitation}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="text-xl font-semibold">{disclaimer.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {disclaimer.generatedAtLine}
          </p>
        </div>

        {disclaimer.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}

        <div className="flex flex-wrap gap-3 border-t pt-4 print:hidden">
          <button
            type="button"
            onClick={handlePdfDownload}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleCsvPreview}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Download BOM (CSV)
          </button>
        </div>
      </section>
      {isCsvPreviewOpen && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:hidden"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setIsCsvPreviewOpen(false);
      }
    }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-preview-title"
      className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-background p-6 shadow-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="csv-preview-title" className="text-xl font-bold">
            BOM CSV Preview
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the contents before downloading your CSV file.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCsvPreviewOpen(false)}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
        >
          Close
        </button>
      </div>

      <div className="mt-5 space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">{disclaimer.title}</h3>
        <p className="text-sm text-muted-foreground">
          {disclaimer.generatedAtLine}
        </p>

        {disclaimer.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[950px] text-left text-sm">
          <thead className="bg-muted">
            <tr>
              {[
                "Category",
                "SKU",
                "Device",
                "Vendor",
                "Qty",
                `Unit price (${backendPlan.bom.currency})`,
                `Line total (${backendPlan.bom.currency})`,
                "Status",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {backendPlan.bom.lines.map((line, index) => (
              <tr key={`${line.sku}-${index}`} className="border-t">
                <td className="px-4 py-3">{line.category}</td>
                <td className="px-4 py-3">{line.sku}</td>
                <td className="px-4 py-3">{line.name}</td>
                <td className="px-4 py-3">{line.vendor}</td>
                <td className="px-4 py-3">{line.qty}</td>
                <td className="px-4 py-3">
                  {formatMoney(line.unitPrice, backendPlan.bom.currency)}
                </td>
                <td className="px-4 py-3">
                  {formatMoney(line.lineTotal, backendPlan.bom.currency)}
                </td>
                <td className="px-4 py-3">{line.status}</td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t bg-muted/50">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right font-semibold">
                {backendPlan.bom.totalIsPartial
                  ? "Total (partial)"
                  : "Total"}
              </td>
              <td className="px-4 py-3 font-bold">
                {formatMoney(backendPlan.bom.total, backendPlan.bom.currency)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => setIsCsvPreviewOpen(false)}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleCsvDownload}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Download CSV
        </button>
      </div>
    </section>
  </div>
)}
    </main>
  );
}
