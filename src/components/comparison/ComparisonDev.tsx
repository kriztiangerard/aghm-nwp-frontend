
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Comparison, {
  type PlanChoice,
} from "@/components/comparison/Comparison";

import {
  VENDOR_NAMES,
  type DefaultVendors,
  type NetworkPlanData,
  type PlanTier,
} from "@/components/comparison/types";

import { scenarios } from "@/components/comparison/fixtures";
import { usePlanResult } from "@/components/comparison/plan-result-context";
import { useSelectedPlan } from "@/components/comparison/selected-plan-context";

type DefaultMode = "derived" | "null";

export default function ComparisonDev() {
  const navigate = useNavigate();

  const { setResult } = usePlanResult();
  const { clear } = useSelectedPlan();

  const [name, setName] = useState("happy");
  const [defaultMode, setDefaultMode] =
    useState<DefaultMode>("derived");

  const [continued, setContinued] = useState<{
    choice: PlanChoice;
    plan: NetworkPlanData;
  } | null>(null);

  const plansData = scenarios[name];

  // Test defaults only. Production defaults come from the engine.
  // Prefer the last complete vendor to distinguish this from
  // the first-vendor fallback.
  const testDefaultFor = (tier: PlanTier) => {
    const completeVendors = VENDOR_NAMES.filter(
      (vendor) => plansData?.[vendor]?.[tier]?.complete === true,
    );

    return completeVendors[completeVendors.length - 1] ?? null;
  };

  const defaultVendors: DefaultVendors =
    defaultMode === "null"
      ? {
          "Cost-Efficient": null,
          "High-Performance": null,
        }
      : {
          "Cost-Efficient": testDefaultFor("Cost-Efficient"),
          "High-Performance": testDefaultFor("High-Performance"),
        };

  // Load the current fixture into the actual application route flow.
  const openActualComparison = () => {
    if (!plansData) return;

    setResult({
      plansData,
      defaultVendors,
    });

    // Prevent a previous report selection from carrying over.
    clear();

    navigate("/comparison");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b p-4">
        {Object.keys(scenarios).map((scenarioName) => (
          <button
            key={scenarioName}
            type="button"
            onClick={() => {
              setName(scenarioName);
              setContinued(null);
            }}
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

      <div className="space-y-2 border-b p-4">
        <p className="text-sm font-medium">
          Default-vendor test mode
        </p>

        <div className="flex flex-wrap gap-2">
          {(["derived", "null"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setDefaultMode(mode);
                setContinued(null);
              }}
              className={`rounded border px-3 py-1 text-sm ${
                defaultMode === mode
                  ? "bg-primary text-primary-foreground"
                  : ""
              }`}
            >
              {mode === "derived"
                ? "Explicit test defaults"
                : "Null defaults"}
            </button>
          ))}
        </div>

        <pre className="overflow-auto text-xs">
          {JSON.stringify(defaultVendors, null, 2)}
        </pre>
      </div>

      <div className="border-b p-4">
        <button
          type="button"
          onClick={openActualComparison}
          disabled={!plansData}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Load fixture into actual comparison route
        </button>

        <p className="mt-2 text-xs text-muted-foreground">
          Loads the selected fixture into the actual comparison
          and report navigation flow.
        </p>
      </div>

      <Comparison
        key={`${name}-${defaultMode}`}
        plansData={plansData}
        defaultVendors={defaultVendors}
        onContinue={(choice, plan) => {
          setContinued({ choice, plan });
        }}
      />

      {continued && (
        <section className="mx-auto max-w-7xl space-y-2 px-4 pb-8">
          <h2 className="text-sm font-semibold">
            Confirmed report selection — development preview
          </h2>

          <pre className="overflow-auto rounded border p-4 text-xs">
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
        </section>
      )}
    </div>
  );
}
