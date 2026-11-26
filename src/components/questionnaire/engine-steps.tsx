import type { LoadingState } from '@/components/ui/multi-step-loader'

// Illustrative walk through what the planning engine does for a submission
// (see the engine's run/orchestration flow). Timings are cosmetic: the request
// can finish at any step, and the last step is held until it does.
export const ENGINE_STEPS: LoadingState[] = [
  { text: 'Validating requirements' },
  { text: 'Deriving network requirements' },
  { text: 'Loading the catalog and prices' },
  { text: 'Selecting gateways and access points' },
  { text: 'Budgeting PoE power' },
  { text: 'Selecting switches' },
  { text: 'Building plans' },
  { text: 'Compiling bills of materials' },
  { text: 'Choosing default vendors' },
  { text: 'Assembling topologies and results' },
]

export const ENGINE_STEP_DURATION_MS = 1500