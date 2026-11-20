import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * shadcn Skeleton. Added by hand for NWP-TOPO-006 because
 * `npx shadcn add skeleton` could not be run; the CLI version is equivalent.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
