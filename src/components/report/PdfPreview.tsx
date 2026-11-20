import { useEffect, useRef, useState } from "react";
import { buildReportPdf } from "@/lib/report/buildReportPdf";
import { createTopologySnapshot } from "@/components/topology/topology-snapshot";
import type { NetworkPlanData } from "@/components/comparison/types";
import type { ReportViewModel } from "@/lib/report/report-view-model";

type PreviewPayload = {
  type: "NWP_PDF_DATA";
  report: ReportViewModel;
  plan: NetworkPlanData;
  filename: string;
};

export default function PdfPreview() {
  const [url, setUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState("network-report.pdf");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    const receive = async (event: MessageEvent<PreviewPayload>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.opener ||
        event.data?.type !== "NWP_PDF_DATA" ||
        started.current
      ) {
        return;
      }

      started.current = true;

      const { report, plan, filename: requestedFilename } = event.data;

      try {
        let snapshotDataUrl: string | null = null;

        try {
          const snapshot = await createTopologySnapshot(plan, {
            maxWidth: 1200,
            padding: 40,
            pixelRatio: 2,
          });

          if (snapshot.status === "success") {
            snapshotDataUrl = snapshot.dataUrl;
          } else {
            console.warn("Topology unavailable:", snapshot.reason);
          }
        } catch (snapshotError) {
          console.warn("Topology snapshot failed:", snapshotError);
        }

        const blob = await buildReportPdf(report, snapshotDataUrl);

        if (disposed) return;

        objectUrl = URL.createObjectURL(blob);
        setFilename(requestedFilename);
        document.title = requestedFilename;
        setUrl(objectUrl);

        window.opener?.postMessage(
          { type: "NWP_PDF_SUCCESS" },
          window.location.origin,
        );
      } catch (generationError) {
        console.error("PDF generation failed:", generationError);
        if (!disposed) {
          setError("Unable to generate the PDF report. Please try again.");

          window.opener?.postMessage(
            { type: "NWP_PDF_ERROR" },
            window.location.origin,
          );
        }
      }
    };

    window.addEventListener("message", receive);

    if (window.opener) {
      window.opener.postMessage(
        { type: "NWP_PDF_READY" },
        window.location.origin,
      );
    } else {
      setError("Open the PDF preview from the report page.");
    }

    return () => {
      disposed = true;
      window.removeEventListener("message", receive);

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 20px",
          background: "#f3f4f6",
        }}
      >
        <strong>Network Planning Report</strong>

        {url && (
          <a
            href={url}
            download={filename}
            style={{
              background: "#8200DA",
              color: "#ffffff",
              padding: "10px 16px",
              borderRadius: 6,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Download PDF
          </a>
        )}
      </header>

      {error ? (
        <p role="alert" style={{ padding: 20, color: "#991b1b" }}>
          {error}
        </p>
      ) : url ? (
        <iframe
          src={url}
          title="PDF report preview"
          style={{
            display: "block",
            width: "100%",
            height: "calc(100vh - 64px)",
            border: 0,
          }}
        />
      ) : (
        <p role="status" style={{ padding: 20 }}>
          Generating PDF report...
        </p>
      )}
    </main>
  );
}
