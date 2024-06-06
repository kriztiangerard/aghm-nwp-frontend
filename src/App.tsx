import { Route, Routes, useLocation } from 'react-router-dom'
import SplashPage from './SplashPage'
import Questionnaire from './components/questionnaire/Questionnaire'
import ComparisonRoute from './components/comparison/comparison-route'
import Report from './components/report/Report'
import PdfPreview from './components/report/PdfPreview'
import { PlanResultProvider } from './components/comparison/plan-result-context'
import { SelectedPlanProvider } from './components/comparison/selected-plan-context'
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";

const ComparisonDev = lazy(() => import("@/components/comparison/ComparisonDev"));

function App() {
  const { pathname } = useLocation()

  return (
    <PlanResultProvider>
      <SelectedPlanProvider>
        {pathname !== "/" && (
          <div aria-hidden="true" className="grid-backdrop print:hidden" />
        )}
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/comparison" element={<ComparisonRoute />} />
            <Route path="/report" element={<Report />} />
            <Route path="/pdf-preview" element={<PdfPreview />} />
            {/* Dev-only route */}
            {import.meta.env.DEV && (
              <Route path="/dev/comparison" element={<ComparisonDev />} />
            )}
          </Routes>
        </Suspense>
        <Toaster theme="light" position="top-right" richColors />
      </SelectedPlanProvider>
    </PlanResultProvider>
  )
}

export default App