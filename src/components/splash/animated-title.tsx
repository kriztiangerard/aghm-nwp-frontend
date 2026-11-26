import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const FIRST_LINE = "Dream it."
const OLD_WORDS = "Plan it"
const NEW_WORD = "PlanNet"
const FINAL_TITLE = `${FIRST_LINE} ${NEW_WORD}.`

interface Frame {
  word: string
  /** How many characters of `word`, from the start, are highlighted. */
  selected: number
  caret: "none" | "solid" | "blink"
  /** Milliseconds to stay on this frame. The last frame never advances. */
  hold: number
}

const range = (length: number) => Array.from({ length }, (_, i) => i + 1)

// The whole animation as a list of frames: read, highlight, erase, type.
const FRAMES: Frame[] = [
  { word: OLD_WORDS, selected: 0, caret: "none", hold: 1400 },
  ...range(OLD_WORDS.length).map<Frame>((selected) => ({
    word: OLD_WORDS,
    selected,
    caret: "none",
    hold: selected === OLD_WORDS.length ? 650 : 60,
  })),
  { word: "", selected: 0, caret: "blink", hold: 600 },
  ...range(NEW_WORD.length).map<Frame>((typed) => ({
    word: NEW_WORD.slice(0, typed),
    selected: 0,
    caret: "solid",
    hold: 130,
  })),
  { word: NEW_WORD, selected: 0, caret: "blink", hold: 2200 },
  { word: NEW_WORD, selected: 0, caret: "none", hold: 0 },
]

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

function prefersReducedMotion() {
  return window.matchMedia?.(REDUCED_MOTION).matches ?? false
}

function TitleLines({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="block">{FIRST_LINE}</span>
      <span className="block whitespace-nowrap">{children}</span>
    </>
  )
}

/**
 * The splash heading: "Dream it. Plan it." where "Plan it" is highlighted,
 * erased and replaced by a typed "PlanNet". It plays once per visit. People who
 * prefer reduced motion see the final title straight away, and screen readers
 * only ever hear the final title.
 */
export function AnimatedTitle({ className }: { className?: string }) {
  const [index, setIndex] = useState(() =>
    prefersReducedMotion() ? FRAMES.length - 1 : 0,
  )
  const frame = FRAMES[index]

  useEffect(() => {
    if (index >= FRAMES.length - 1) return
    const timer = window.setTimeout(
      () => setIndex(index + 1),
      FRAMES[index].hold,
    )
    return () => window.clearTimeout(timer)
  }, [index])

  return (
    <h1 className={className}>
      <span className="sr-only">{FINAL_TITLE}</span>
      <span aria-hidden="true" className="block">
        <TitleLines>
          {frame.selected > 0 && (
            <span className="-mx-[0.04em] bg-emerald-400 px-[0.04em] text-black">
              {frame.word.slice(0, frame.selected)}
            </span>
          )}
          {frame.word.slice(frame.selected)}
          {frame.caret !== "none" && (
            // The side margins keep the caret from merging with the period.
            <span
              data-testid="title-caret"
              className={cn(
                "mx-[0.04em] inline-block h-[0.74em] w-[0.06em] bg-current align-baseline",
                frame.caret === "blink" && "animate-pulse",
              )}
            />
          )}
          .
        </TitleLines>
      </span>
    </h1>
  )
}
