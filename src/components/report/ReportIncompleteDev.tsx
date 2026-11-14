import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { engineSample } from "@/components/comparison/engine-sample-fixtures";
import { adaptEngineResult } from "@/components/comparison/adapter";
import { usePlanResult } from "@/components/comparison/plan-result-context";
import { useSelectedPlan } from "@/components/comparison/selected-plan-context";

export default function ReportIncompleteDev() {
  const navigate = useNavigate();
  const { setResult } = usePlanResult();
  const { setSelected } = useSelectedPlan();

  useEffect(() => {
    const adapted = adaptEngineResult(engineSample);

    const incompletePlan =
      adapted.plansData["TP-Link Omada"]?.["Cost-Efficient"];

    if (!incompletePlan) {
      throw new Error(
        "Cost-Efficient fixture for TP-Link Omada was not found.",
      );
    }

    if (incompletePlan.complete) {
      throw new Error(
        "The incomplete-plan QA fixture must have complete = false.",
      );
    }

    setResult(adapted);

    setSelected(
      {
        vendor: "TP-Link Omada",
        tier: "Cost-Efficient",
      },
      incompletePlan,
    );

    navigate("/report", { replace: true });
  }, [navigate, setResult, setSelected]);

  return (
    <p className="p-6">
      Preparing incomplete-plan QA test...
    </p>
  );
}