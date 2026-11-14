
import React, { createContext, useContext, useMemo, useState } from "react";
import type { NetworkPlanData, PlanTier, VendorName } from "./types";
import type { PlanChoice } from "./Comparison";

type PanelChoices = Record<PlanTier, VendorName | null>;

interface SelectedPlanValue {
  choice: PlanChoice | null;
  plan: NetworkPlanData | null;
  panelChoices: PanelChoices;
  selectedTier: PlanTier | null;
  setSelected: (choice: PlanChoice, plan: NetworkPlanData) => void;
  setPanelChoice: (tier: PlanTier, vendor: VendorName) => void;
  setSelectedTier: (tier: PlanTier | null) => void;
  clear: () => void;
}

const initialPanelChoices: PanelChoices = {
  "Cost-Efficient": null,
  "High-Performance": null,
};

const SelectedPlanContext = createContext<SelectedPlanValue | null>(null);

export const SelectedPlanProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<{
    choice: PlanChoice;
    plan: NetworkPlanData;
  } | null>(null);

  const [panelChoices, setPanelChoices] =
    useState<PanelChoices>(initialPanelChoices);

  const [selectedTier, setSelectedTier] = useState<PlanTier | null>(null);

  const value = useMemo<SelectedPlanValue>(
    () => ({
      choice: state?.choice ?? null,
      plan: state?.plan ?? null,
      panelChoices,
      selectedTier,
      setSelected: (choice, plan) => setState({ choice, plan }),
      setPanelChoice: (tier, vendor) =>
        setPanelChoices((current) => ({ ...current, [tier]: vendor })),
      setSelectedTier,
      clear: () => {
        setState(null);
        setPanelChoices(initialPanelChoices);
        setSelectedTier(null);
      },
    }),
    [state, panelChoices, selectedTier],
  );

  return (
    <SelectedPlanContext.Provider value={value}>
      {children}
    </SelectedPlanContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSelectedPlan = (): SelectedPlanValue => {
  const ctx = useContext(SelectedPlanContext);

  if (!ctx) {
    throw new Error("useSelectedPlan must be used inside <SelectedPlanProvider>");
  }

  return ctx;
};
