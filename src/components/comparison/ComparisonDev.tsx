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

    if (name !== "happy" || !happyPlans) {
      return;
    }

    setSelected(choice, plan);

    setResult({
      engineResult: reportDevEngineResult,
      questionnaireData: reportDevQuestionnaireData,
      plansData: happyPlans,
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
