import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Comparison, { type PlanChoice } from "@/components/comparison/Comparison";
import type {
  BomLineItem,
  NetworkPlanData,
} from "@/components/comparison/types";
import { scenarios } from "@/components/comparison/fixtures";
import { usePlanResult } from "@/components/comparison/plan-result-context";
import { useSelectedPlan } from "@/components/comparison/selected-plan-context";
import type { Plan as EnginePlan } from "@/types/api-types";

import {
  reportDevEngineResult,
  reportDevQuestionnaireData,
} from "@/components/report/report-dev-fixture";

const defaultVendors = {
  "Cost-Efficient": "TP-Link Omada",
  "High-Performance": "TP-Link Omada",
} as const;

const engineBomCategory: Partial<
  Record<BomLineItem["category"], EnginePlan["bom"]["lines"][number]["category"]>
> = {
  Gateway: "gateway",
  Switch: "switch",
  "Access Point": "access_point",
  Controller: "controller",
};

function toEngineBomLine(line: BomLineItem, vendor: string) {
  const category = engineBomCategory[line.category];
  if (!category) {
    throw new Error(`Cannot add "${line.category}" to the dev report fixture.`);
  }

  return {
    category,
    sku: line.sku,
    name: line.name,
    vendor,
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
    ...(line.priceUpdatedAt ? { priceUpdatedAt: line.priceUpdatedAt } : {}),
  };
}

function engineResultForTopologyScenario(
  choice: PlanChoice,
  selectedPlan: NetworkPlanData,
) {
  const topology = selectedPlan.topology;
  if (!topology) {
    throw new Error("TOPO-003 dev scenario is missing topology data.");
  }

  const planType = choice.tier === "Cost-Efficient" ? "CE" : "HP";
  const sourcePlan = reportDevEngineResult.plans.find(
    (candidate) =>
      candidate.vendor === choice.vendor && candidate.planType === planType,
  );
  if (!sourcePlan) {
    throw new Error(
      `No dev report plan for vendor "${choice.vendor}" and plan type "${planType}".`,
    );
  }

  const lines = selectedPlan.bom.map((line) =>
    toEngineBomLine(line, choice.vendor),
  );

  return {
    ...reportDevEngineResult,
    plans: reportDevEngineResult.plans.map((candidate) =>
      candidate === sourcePlan
        ? {
            ...candidate,
            complete: selectedPlan.complete,
            items: lines.map(({ category, sku, qty }) => ({
              category,
              sku,
              qty,
            })),
            bom: {
              currency: selectedPlan.currency,
              lines,
              total: selectedPlan.totalCost,
              totalIsPartial: selectedPlan.totalIsPartial,
            },
            topology: {
              nodes: topology.nodes,
              edges: topology.edges,
            },
          }
        : candidate,
    ),
  };
}

export default function ComparisonDev() {
  const navigate = useNavigate();

  const [name, setName] = useState("happy");
  const [continued, setContinued] = useState<{
    choice: PlanChoice;
    plan: NetworkPlanData;
  } | null>(null);

  const { setResult, clearResult } = usePlanResult();
  const { setSelected, clear } = useSelectedPlan();

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

  const handleContinue = (choice: PlanChoice, plan: NetworkPlanData) => {
    setContinued({ choice, plan });

    const isTopologyScenario = name.startsWith("topo003:");
    const plansData = scenarios[name];
    if ((name !== "happy" && !isTopologyScenario) || !plansData) {
      return;
    }

    setSelected(choice, plan);

    setResult({
      engineResult: isTopologyScenario
        ? engineResultForTopologyScenario(choice, plan)
        : reportDevEngineResult,
      questionnaireData: reportDevQuestionnaireData,
      plansData,
      defaultVendors,
    });

    navigate("/report");
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

      {continued &&
        name !== "happy" &&
        !name.startsWith("topo003:") && (
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
