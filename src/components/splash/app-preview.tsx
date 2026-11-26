import darkPreview from "@/assets/splash-preview.webp"
import lightPreview from "@/assets/splash-preview-light.webp"

/**
 * Decorative picture of the app on the splash page: a glowing frame with half
 * of it past the right edge (the page hides the overflow). Shown on wide screens
 * only; its width follows the free space beside the text, so they never overlap.
 * To change the picture, replace splash-preview-light.webp and splash-preview.webp
 * (dark) with 4:3 screenshots. Only their left halves are visible.
 */
export function AppPreview() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 right-0 hidden w-[min(70rem,115vh,calc(2*(100vw_-_50rem)))] translate-x-1/2 -translate-y-1/2 lg:block"
    >
      {/* The glow is its own layer, so pulsing only animates opacity. */}
      <div className="absolute inset-0 rounded-[2rem] shadow-[0_0_70px_10px_rgb(147_51_234/0.4)] dark:shadow-[0_0_70px_10px_rgb(147_51_234/0.65)] motion-safe:animate-pulse motion-safe:[animation-duration:4s]" />
      <div className="relative overflow-hidden rounded-[2rem] border-2 border-purple-500/80 bg-white shadow-[0_0_18px_rgb(147_51_234/0.55)] dark:bg-black dark:shadow-[0_0_18px_rgb(147_51_234/0.75)]">
        {/* <picture> downloads only the image that matches the system theme. */}
        <picture>
          <source media="(prefers-color-scheme: dark)" srcSet={darkPreview} />
          <img
            src={lightPreview}
            alt=""
            width={1600}
            height={1200}
            decoding="async"
            className="block h-auto w-full"
          />
        </picture>
      </div>
    </div>
  )
}
