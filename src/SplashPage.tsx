import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SonarGrid } from '@/components/ui/sonar-grid'
import { AnimatedTitle } from '@/components/splash/animated-title'
import { AppPreview } from '@/components/splash/app-preview'

// Lets the click glow be seen before the page changes.
const GLOW_BEFORE_NAVIGATE_MS = 450

interface SplashLocationState {
  reportMessage?: string
}

function SplashPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as SplashLocationState | null
  const reportMessage = locationState?.reportMessage
  const [launching, setLaunching] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const handleStart = () => {
    if (launching) return
    setLaunching(true)
    timer.current = window.setTimeout(
      () => navigate('/questionnaire'),
      GLOW_BEFORE_NAVIGATE_MS,
    )
  }

  return (
    <main className="relative isolate flex min-h-screen items-center overflow-hidden bg-black px-8 sm:px-12 lg:px-20">
      <SonarGrid pingArea="center" />
      {/* Darkens the grid behind the copy so the text stays readable. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_30%_50%,rgb(0_0_0/0.75),transparent)]"
      />
      <AppPreview />
      <section className="relative w-full max-w-2xl">
        <AnimatedTitle className="text-6xl font-bold text-emerald-400 sm:text-7xl" />

        <p className="mt-8 max-w-xl text-base leading-relaxed text-white sm:text-lg">
          PlanNet is an intelligent, automated network infrastructure
          planning tool designed to take the guesswork out of network
          deployment for small and medium-sized businesses. By translating
          structural requirements into vendor-specific hardware
          recommendations, the platform generates comprehensive bills of
          materials and interactive logical network topologies.
        </p>

        {reportMessage && (
          <div
            role="alert"
            className="mt-6 rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-100"
          >
            {reportMessage}
          </div>
        )}

        <div className="mt-8">
          <Button
            type="button"
            size="lg"
            onClick={handleStart}
            data-glowing={launching}
            className="glow-button h-10! px-6! text-sm! font-semibold!"
          >
            Start Network Generation
          </Button>
        </div>
      </section>
    </main>
  )
}

export default SplashPage