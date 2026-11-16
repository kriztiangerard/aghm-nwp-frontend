
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Comparison, { type PlanChoice } from "@/components/comparison/Comparison";
import type { NetworkPlanData } from "@/components/comparison/types";
import { scenarios } from "@/components/comparison/fixtures";
import { usePlanResult } from "@/components/comparison/plan-result-context";
import { useSelectedPlan } from "@/components/comparison/selected-plan-context";

import {
  reportDevEngineResult,
  reportDevQuestionnaireData,
} from "@/components/report/report-dev-fixture";

import { createTopologySnapshot } from "@/components/topology/topology-snapshot";
import type { TopologyPayload } from "@/components/topology/types";

const defaultVendors = {
  "Cost-Efficient": "TP-Link Omada",
  "High-Performance": "TP-Link Omada",
} as const;

type SnapshotScenario = "normal" | "stress" | "missing";

const snapshotScenarioLabels: Record<SnapshotScenario, string> = {
  normal: "Normal topology (6 nodes)",
  stress: "Stress topology (43 nodes)",
  missing: "Missing topology (failure test)",
};

function isTopologyPayload(value: unknown): value is TopologyPayload {
  if (
    typeof value !== "object" ||
    value === null ||
    !("nodes" in value) ||
    !("edges" in value) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  ) {
    return false;
  }

  const validNodes = value.nodes.every(
    (node: unknown) =>
      typeof node === "object" &&
      node !== null &&
      "id" in node &&
      typeof node.id === "string" &&
      "role" in node &&
      typeof node.role === "string" &&
      "layer" in node &&
      typeof node.layer === "string" &&
      "label" in node &&
      typeof node.label === "string",
  );

  const validEdges = value.edges.every(
    (edge: unknown) =>
      typeof edge === "object" &&
      edge !== null &&
      "id" in edge &&
      typeof edge.id === "string" &&
      "source" in edge &&
      typeof edge.source === "string" &&
      "target" in edge &&
      typeof edge.target === "string" &&
      "type" in edge &&
      typeof edge.type === "string",
  );

  return validNodes && validEdges;
}

export default function ComparisonDev() {
  const navigate = useNavigate();

  const [name, setName] = useState("happy");
  const [continued, setContinued] = useState<{
    choice: PlanChoice;
    plan: NetworkPlanData;
  } | null>(null);

  const [snapshotScenario, setSnapshotScenario] =
    useState<SnapshotScenario>("normal");
  const [isCapturing, setIsCapturing] = useState(false);
  const [snapshotStatus, setSnapshotStatus] = useState<string | null>(null);

  const { setResult, clearResult } = usePlanResult();
  const { setSelected, clear } = useSelectedPlan();

  const happyPlans = scenarios.happy;

  // Existing topology-enabled six-node fixture.
  // Use the complete variant so it is suitable for normal QA testing.
  const normalSnapshotPlan =
    scenarios.engineSampleComplete?.["TP-Link Omada"]?.["Cost-Efficient"];

  // Reuse the existing 43-node fixture; do not duplicate its topology.
  const stressSnapshotPlan =
    scenarios.topo002Stress?.["TP-Link Omada"]?.["Cost-Efficient"];

  const snapshotBasePlan =
    snapshotScenario === "stress"
      ? stressSnapshotPlan
      : normalSnapshotPlan;

  // The missing-topology case is derived from the normal fixture.
  const snapshotPlan =
    snapshotScenario === "missing" && normalSnapshotPlan
      ? { ...normalSnapshotPlan, topology: null }
      : snapshotBasePlan;

  useEffect(() => {
    clear();
    clearResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScenarioChange = (nextName: string) => {
    setName(nextName);
    setContinued(null);
    clear();
    clearResult();
  };

  const handleSnapshotScenarioChange = (
    nextScenario: SnapshotScenario,
  ) => {
    setSnapshotScenario(nextScenario);
    setSnapshotStatus(null);
  };

  const handleDownloadTopologySnapshot = async () => {
    if (!snapshotPlan || isCapturing) return;

    setIsCapturing(true);
    setSnapshotStatus("Generating topology snapshot...");

    try {
      const result = await createTopologySnapshot(snapshotPlan, {
        maxWidth: 1200,
        padding: 56,
        pixelRatio: 2,
      });

      if (result.status === "unavailable") {
        setSnapshotStatus(`Snapshot unavailable: ${result.reason}`);
        return;
      }

      const downloadLink = document.createElement("a");
      downloadLink.href = result.dataUrl;
      downloadLink.download =
        snapshotScenario === "stress"
          ? "r007-stress-topology.png"
          : `r007-${snapshotScenario}-topology.png`;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      setSnapshotStatus(
        `PNG downloaded successfully. Export dimensions: ${result.width} × ${result.height}px.`,
      );
    } catch (error) {
      setSnapshotStatus(
        error instanceof Error
          ? `Snapshot test failed: ${error.message}`
          : "Snapshot test failed due to an unexpected error.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleContinue = (choice: PlanChoice, plan: NetworkPlanData) => {
    setContinued({ choice, plan });

    const isReportQaScenario =
      name === "pricingStates" || name === "longBom";

    if ((name !== "happy" && !isReportQaScenario) || !happyPlans) {
      return;
    }

    const selectedTier =
      choice.tier === "Cost-Efficient" ? "CE" : "HP";

    const engineResult = isReportQaScenario
      ? {
          ...reportDevEngineResult,
          plans: reportDevEngineResult.plans.map((enginePlan) => {
            if (
              enginePlan.vendor !== choice.vendor ||
              enginePlan.planType !== selectedTier
            ) {
              return enginePlan;
            }

            const lines = plan.bom.map((line) => ({
              category: line.category
                .toLowerCase()
                .replace(/\s+/g, "_") as
                  import("@/types/api-types").BomCategory,
              sku: line.sku,
              name: line.name,
              vendor: choice.vendor,
              qty: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.subtotal,
              status:
                line.status === "SUNSETTING"
                  ? ("SUNSETTING" as const)
                  : ("ACTIVE" as const),
              isGeneric: line.isGeneric,
              priceSource: line.priceSource,
              isStale: line.isStale,
              priceUpdatedAt: line.priceUpdatedAt ?? undefined,
            }));

            return {
              ...enginePlan,
              bom: {
                ...enginePlan.bom,
                lines,
                total: plan.totalCost,
                totalIsPartial: plan.totalIsPartial,
              },
            };
          }),
        }
      : reportDevEngineResult;

    // Reuse the matching report fixture topology only after validating it.
    const matchingEnginePlan = reportDevEngineResult.plans.find(
      (enginePlan) =>
        enginePlan.vendor === choice.vendor &&
        enginePlan.planType === selectedTier,
    );

    const matchingTopology = matchingEnginePlan?.topology;

    const selectedPlan: NetworkPlanData =
      isTopologyPayload(matchingTopology)
        ? {
            ...plan,
            topology: matchingTopology,
          }
        : plan;

    setSelected(choice, selectedPlan);

    setResult({
      engineResult,
      questionnaireData: reportDevQuestionnaireData,
      plansData: isReportQaScenario
        ? (scenarios[name] ?? happyPlans)
        : happyPlans,
      defaultVendors,
    });

    navigate("/report", {
      state: { returnTo: "/dev/comparison" },
    });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b p-4">
        {Object.keys(scenarios).map((scenarioName) => (
          <button
            key={scenarioName}
            type="button"
            onClick={() => handleScenarioChange(scenarioName)}
            className={`rounded border px-3 py-1 text-sm ${
              scenarioName === name
                ? "bg-primary text-primary-foreground"
                : ""
            }`}
          >
            {scenarioName}
          </button>
        ))}
      </div>

      <Comparison
        key={name}
        plansData={scenarios[name]}
        defaultVendors={defaultVendors}
        onContinue={handleContinue}
      />

      {/* R007 development-only snapshot QA controls */}
      <section
        aria-labelledby="r007-snapshot-heading"
        className="mx-auto mb-8 max-w-7xl space-y-4 rounded-lg border p-4"
      >
        <div className="space-y-1">
          <h2
            id="r007-snapshot-heading"
            className="text-lg font-semibold"
          >
            R007 – Topology Snapshot QA
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate and download the actual PNG produced by
            createTopologySnapshot(). This test is independent of PDF
            generation.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-2">
            <label
              htmlFor="r007-snapshot-scenario"
              className="text-sm font-medium"
            >
              Snapshot test scenario
            </label>

            <select
              id="r007-snapshot-scenario"
              value={snapshotScenario}
              onChange={(event) =>
                handleSnapshotScenarioChange(
                  event.target.value as SnapshotScenario,
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              disabled={isCapturing}
            >
              {(
                Object.keys(snapshotScenarioLabels) as SnapshotScenario[]
              ).map((scenario) => (
                <option key={scenario} value={scenario}>
                  {snapshotScenarioLabels[scenario]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleDownloadTopologySnapshot}
            disabled={!snapshotPlan || isCapturing}
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCapturing ? "Generating PNG..." : "Download Topology PNG"}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Export settings: maximum width 1200 CSS pixels, 56 pixels
          padding, and 2× PNG pixel ratio.
        </p>

        {snapshotStatus && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-md border p-3 text-sm"
          >
            {snapshotStatus}
          </p>
        )}

        {!snapshotPlan && (
          <p className="text-sm text-destructive">
            The selected snapshot fixture is unavailable. Check the
            fixture registration before running this test.
          </p>
        )}
      </section>

      {continued && name !== "happy" && (
        <pre className="mx-auto max-w-7xl px-4 pb-8 text-xs">
          {JSON.stringify(
            {
              tier: continued.choice.tier,
              vendor: continued.choice.vendor,
              complete: continued.plan.complete,
              totalCost: continued.plan.totalCost,
              bomLines: continued.plan.bom.length,
            },
            null,
            2,
          )}
        </pre>
      )}
    </div>
  );
}
