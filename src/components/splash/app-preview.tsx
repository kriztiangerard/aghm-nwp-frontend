import preview from "@/assets/splash-preview.webp"

/**
 * Decorative picture of the app on the splash page: a glowing frame with half
 * of it past the right edge (the page hides the overflow). Shown on wide screens
 * only; its width follows the free space beside the text, so they never overlap.
 * To change the picture, replace splash-preview.webp with a 4:3 screenshot. Only
 * its left half is visible.
 */
export function AppPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-0 hidden w-[min(70rem,115vh,calc(2*(100vw_-_50rem)))] translate-x-1/2 -translate-y-1/2 lg:block"
    >
      {/* The glow is its own layer, so pulsing only animates opacity. */}
      <div className="absolute inset-0 rounded-xl shadow-[0_0_70px_10px_rgb(52_211_153/0.45)] motion-safe:animate-pulse motion-safe:[animation-duration:4s]" />
      <div className="relative overflow-hidden rounded-xl border-2 border-emerald-400/80 bg-black shadow-[0_0_18px_rgb(52_211_153/0.6)]">
        <img
          src={preview}
          alt=""
          width={1600}
          height={1200}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
    </div>
  )
}
