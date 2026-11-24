import type { LoadingState } from '@/components/ui/multi-step-loader'

// Illustrative walk through what the planning engine does for a submission
// (see the engine's run/orchestration flow). Timings are cosmetic: the request
// can finish at any step, and the last step is held until it does.
export const ENGINE_STEPS: LoadingState[] = [
  { text: 'Validating your requirements' },
  { text: 'Normalizing your answers' },
  { text: 'Deriving network and wireless requirements' },
  { text: 'Estimating devices, connectivity and power' },
  { text: 'Loading the hardware catalog and latest prices' },
  { text: 'Selecting gateways and access points' },
  { text: 'Budgeting PoE power' },
  { text: 'Selecting switches' },
  { text: 'Building Cost-Efficient and High-Performance plans' },
  { text: 'Compiling bills of materials' },
  { text: 'Choosing default vendors' },
  { text: 'Assembling topologies and results' },
]

export const ENGINE_STEP_DURATION_MS = 1500