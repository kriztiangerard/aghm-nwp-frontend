import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Comparison from "./Comparison";
import { usePlanResult } from "./plan-result-context";
import { useSelectedPlan } from "./selected-plan-context";

export default function ComparisonRoute() {
  const { result, setQuestionnaireDraft, clearResult } = usePlanResult();
  const { setSelected, clear: clearSelected } = useSelectedPlan();
  const navigate = useNavigate();
  const location = useLocation();
  const [leaving, setLeaving] = useState(false);
  const returnTo =
    location.state?.returnTo === "/dev/comparison"
      ? "/dev/comparison"
      : "/comparison";

  // After a refresh (or a direct visit) nothing has been generated, so go back.
  // While leaving via "Back to summary" the result is cleared on purpose, so this
  // guard must not fire: its stateless <Navigate> would override our navigate()
  // below and drop the returnToSummary flag (landing on step 1 with blank answers).
  if (!result) return leaving ? null : <Navigate to="/questionnaire" replace />;

  return (
    <Comparison
      plansData={result.plansData}
      defaultVendors={result.defaultVendors}
      onContinue={(choice, plan) => {
        setSelected(choice, plan);
        navigate("/report", { state: { returnTo } });
      }}
      onBackToSummary={() => {
        setLeaving(true);
        setQuestionnaireDraft(result.questionnaireData);
        navigate("/questionnaire", { state: { returnToSummary: true } });
        clearResult();
        clearSelected();
      }}
    />
  );
}