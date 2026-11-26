import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface SonarGridProps {
  className?: string
  /** Distance between dots, in px. */
  spacing?: number
  /** Radius of an idle dot, in px. */
  dotRadius?: number
  /** Opacity of an idle dot (0-1). */
  baseOpacity?: number
  /** Any CSS color. Canvas cannot resolve CSS variables, so pass a concrete color. */
  color?: string
  /** Thickness of the ring's wavefront, in px. */
  ringWidth?: number
  /** How fast a ring expands, in px per second. */
  speed?: number
  /** How far (px) the wavefront pushes dots outward. */
  amplitude?: number
  /** Seconds between ambient pings. 0 turns ambient pings off. */
  pingEvery?: number
  /** When true, clicking anywhere on the host element sends a ring from that point. */
  interactive?: boolean
  /** Where ambient pings start: anywhere, or near the middle of the grid. */
  pingArea?: "full" | "center"
}

interface Ping {
  x: number
  y: number
  start: number
}

const MAX_PINGS = 8

/**
 * A dot grid that ripples like a sonar sweep. Rings start from ambient pings and
 * (optionally) from clicks, and expand outward, lifting and brightening the dots
 * they pass. Fills its nearest positioned ancestor; render it as the first child
 * of a `relative` container. Draws a static grid under prefers-reduced-motion.
 */
export function SonarGrid({
  className,
  spacing = 28,
  dotRadius = 1.2,
  baseOpacity = 0.18,
  color = "#34d399",
  ringWidth = 110,
  speed = 260,
  amplitude = 6,
  pingEvery = 3.2,
  interactive = true,
  pingArea = "full",
}: SonarGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    const ctx = canvas?.getContext("2d")
    if (!canvas || !host || !ctx) return

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const pings: Ping[] = []
    let width = 0
    let height = 0
    let frame = 0
    let lastAmbient = 0

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }

    const addPing = (x: number, y: number, start: number) => {
      pings.push({ x, y, start })
      if (pings.length > MAX_PINGS) pings.shift()
    }

    const ambientPing = (now: number) => {
      const centered = pingArea === "center"
      const x = width * (centered ? 0.3 + Math.random() * 0.4 : Math.random())
      const y = height * (centered ? 0.3 + Math.random() * 0.4 : Math.random())
      addPing(x, y, now)
    }

    function draw(now: number) {
      ctx!.clearRect(0, 0, width, height)
      ctx!.fillStyle = color

      const animate = !motionQuery.matches
      const reach = Math.hypot(width, height) + ringWidth

      if (animate && pingEvery > 0 && now - lastAmbient >= pingEvery * 1000) {
        lastAmbient = now
        ambientPing(now)
      }

      // Drop rings that have left the canvas.
      for (let i = pings.length - 1; i >= 0; i--) {
        if (((now - pings[i].start) / 1000) * speed > reach) pings.splice(i, 1)
      }

      const cols = Math.ceil(width / spacing) + 1
      const rows = Math.ceil(height / spacing) + 1
      const offsetX = (width - (cols - 1) * spacing) / 2
      const offsetY = (height - (rows - 1) * spacing) / 2

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const gx = offsetX + col * spacing
          const gy = offsetY + row * spacing
          let lift = 0
          let dx = 0
          let dy = 0

          if (animate) {
            for (const ping of pings) {
              const radius = ((now - ping.start) / 1000) * speed
              const vx = gx - ping.x
              const vy = gy - ping.y
              const dist = Math.hypot(vx, vy)
              const offset = Math.abs(dist - radius)
              if (offset >= ringWidth) continue

              // Smooth bump across the wavefront; rings weaken as they travel.
              const bump = Math.cos((offset / ringWidth) * (Math.PI / 2)) ** 2
              const strength = bump * Math.max(0, 1 - radius / reach)
              if (strength <= 0) continue
              lift = Math.max(lift, strength)
              if (dist > 0) {
                dx += (vx / dist) * amplitude * strength
                dy += (vy / dist) * amplitude * strength
              }
            }
          }

          ctx!.globalAlpha = baseOpacity + (1 - baseOpacity) * lift
          ctx!.beginPath()
          ctx!.arc(gx + dx, gy + dy, dotRadius * (1 + lift * 0.9), 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      ctx!.globalAlpha = 1
    }

    const tick = (now: number) => {
      draw(now)
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      cancelAnimationFrame(frame)
      if (motionQuery.matches) {
        pings.length = 0
        draw(performance.now())
      } else {
        // First ambient ping shortly after mount, then every `pingEvery` seconds.
        lastAmbient = performance.now() - Math.max(0, pingEvery * 1000 - 600)
        frame = requestAnimationFrame(tick)
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!interactive || motionQuery.matches) return
      const rect = canvas.getBoundingClientRect()
      addPing(event.clientX - rect.left, event.clientY - rect.top, performance.now())
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    host.addEventListener("pointerdown", onPointerDown)
    motionQuery.addEventListener("change", start)
    resize()
    start()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      host.removeEventListener("pointerdown", onPointerDown)
      motionQuery.removeEventListener("change", start)
    }
  }, [
    spacing,
    dotRadius,
    baseOpacity,
    color,
    ringWidth,
    speed,
    amplitude,
    pingEvery,
    interactive,
    pingArea,
  ])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  )
}