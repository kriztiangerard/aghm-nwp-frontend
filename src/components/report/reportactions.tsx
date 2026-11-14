import { Button } from "@/components/ui/button";
import { buildBomCsv, downloadCsv } from "@/lib/report/buildBomCsv";
import { DisclaimerAlert } from "./disclaimeralert";
import type { ReportViewModel } from "@/lib/report/report-view-model";

// NWP-REPORT-006: the disclaimer sits directly above the download buttons (AC3).
// Both exports are built from the same ReportViewModel the page shows, so the prices and
// timestamp cannot differ from what the user saw (AC5).

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ReportActions({ report }: { report: ReportViewModel }) {
  const handleCsv = () => {
    const csv = buildBomCsv(report.bom, report.generatedAtIso);
    downloadCsv(csv, `bom-${slug(report.selectedVendor)}-${report.selectedPlanType.toLowerCase()}.csv`);
  };

  return (
    <section className="space-y-4">
      <DisclaimerAlert generatedAt={report.generatedAtIso} />
      <div className="flex flex-wrap gap-2">
        {/* TODO(REPORT-004): enable and call buildReportPdf(report), then save the returned Blob. */}
        <Button disabled title="PDF export is not available yet">
          Download report (PDF)
        </Button>
        <Button variant="outline" onClick={handleCsv}>
          Download BOM (CSV)
        </Button>
      </div>
    </section>
  );
}