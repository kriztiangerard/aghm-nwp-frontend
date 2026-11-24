import { useEffect, useState, useSyncExternalStore } from "react"
import { Check, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LoadingState {
  text: string
}

const ROW_REM = 3
const VIEWPORT_REM = 18

const DARK_QUERY = "(prefers-color-scheme: dark)"

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Follows the operating system's light/dark setting, live. */
function useSystemDark() {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  )
}

/**
 * The step list: finished steps get a check, the current step is highlighted and
 * kept centered, and the rest fade with distance. `value` is the current index.
 */
export function LoaderCore({
  loadingStates,
  value = 0,
  className,
}: {
  loadingStates: LoadingState[]
  value?: number
  className?: string
}) {
  const shift = VIEWPORT_REM / 2 - (value + 0.5) * ROW_REM

  return (
    <div
      aria-hidden="true"
      className={cn("relative w-full overflow-hidden", className)}
      style={{
        height: `${VIEWPORT_REM}rem`,
        maskImage:
          "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 25%, black 75%, transparent)",
      }}
    >
      <ul
        className="absolute inset-x-0 top-0 transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateY(${shift}rem)` }}
      >
        {loadingStates.map((state, index) => {
          const done = index < value
          const current = index === value
          const distance = Math.abs(index - value)

          return (
            <li
              key={index}
              className="flex items-center gap-3 transition-opacity duration-500 motion-reduce:transition-none"
              style={{
                height: `${ROW_REM}rem`,
                opacity: Math.max(0.12, 1 - distance * 0.3),
              }}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
                  done &&
                    "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-black",
                  current &&
                    "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400",
                  !done && !current && "border-foreground/30 text-transparent",
                )}
              >
                {done ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : current ? (
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
                ) : null}
              </span>
              <span
                className={cn(
                  "font-sans text-base transition-colors duration-300 sm:text-lg",
                  current
                    ? "font-heading font-semibold text-emerald-700 dark:text-emerald-300"
                    : "text-foreground",
                )}
              >
                {state.text}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Running({
  loadingStates,
  duration,
  loop,
}: {
  loadingStates: LoadingState[]
  duration: number
  loop: boolean
}) {
  const [current, setCurrent] = useState(0)
  const last = loadingStates.length - 1
  const dark = useSystemDark()

  useEffect(() => {
    // Without `loop`, the last step stays on screen until `loading` turns false.
    if (!loop && current >= last) return
    const id = setTimeout(() => {
      setCurrent((c) => (loop ? (c + 1) % loadingStates.length : Math.min(c + 1, last)))
    }, duration)
    return () => clearTimeout(id)
  }, [current, duration, loop, last, loadingStates.length])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      // Setting `dark` here swaps in the app's dark palette (index.css) for the
      // overlay when the OS is in dark mode; otherwise the light palette applies.
      className={cn(
        "fixed inset-0 z-[100] flex h-full w-full flex-col items-center justify-center bg-background/85 font-sans text-foreground backdrop-blur-2xl animate-in fade-in duration-500 motion-reduce:animate-none",
        dark && "dark",
      )}
    >
      <span className="sr-only">
        Step {current + 1} of {loadingStates.length}: {loadingStates[current]?.text}
      </span>
      <div className="w-full max-w-md px-8">
        <LoaderCore loadingStates={loadingStates} value={current} />
        <p aria-hidden="true" className="mt-4 text-center font-sans text-xs tracking-wide text-muted-foreground">
          Step {current + 1} of {loadingStates.length}
        </p>
      </div>
    </div>
  )
}

export interface MultiStepLoaderProps {
  loadingStates: LoadingState[]
  /** Shows the overlay while true. Steps restart from the first each time it turns on. */
  loading?: boolean
  /** Milliseconds each step stays current before moving on. */
  duration?: number
  /** Restart from the first step after the last. When false, the last step is held. */
  loop?: boolean
}

/** Full-screen overlay that walks through a list of steps while work is in progress. */
export function MultiStepLoader({
  loadingStates,
  loading,
  duration = 2000,
  loop = true,
}: MultiStepLoaderProps) {
  if (!loading || loadingStates.length === 0) return null
  // Mounted only while loading, so every run starts at step one.
  return <Running loadingStates={loadingStates} duration={duration} loop={loop} />
}