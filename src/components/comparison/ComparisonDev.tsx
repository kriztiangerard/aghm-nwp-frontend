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

const defaultVendors = {
  "Cost-Efficient": "TP-Link Omada",
  "High-Performance": "TP-Link Omada",
} as const;

export default function ComparisonDev() {
  const navigate = useNavigate();

  const [name, setName] = useState("happy");
  const [continued, setContinued] = useState<{
    choice: PlanChoice;
    plan: NetworkPlanData;
  } | null>(null);

  const { setResult, clearResult } = usePlanResult();
  const { setSelected, clear } = useSelectedPlan();

  const happyPlans = scenarios.happy;

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

    const isReportQaScenario =
      name === "pricingStates" || name === "longBom";

    if ((name !== "happy" && !isReportQaScenario) || !happyPlans) {
      return;
    }

    const engineResult = isReportQaScenario
      ? {
          ...reportDevEngineResult,
          plans: reportDevEngineResult.plans.map((enginePlan) => {
            const selectedTier =
              choice.tier === "Cost-Efficient" ? "CE" : "HP";

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
              status: line.status === "SUNSETTING" ? "SUNSETTING" as const : "ACTIVE" as const,
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

    setSelected(choice, plan);

    setResult({
      engineResult,
      questionnaireData: reportDevQuestionnaireData,
      plansData: isReportQaScenario
        ? (scenarios[name] ?? happyPlans)
        : happyPlans,
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
