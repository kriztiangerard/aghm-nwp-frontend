/**
 * NWP-TOPO-006 AC3 (QA only): dev-only fault injection for the topology panel.
 *
 * Add `?topologyFault=<kind>` to the URL in `npm run dev` to make one stage
 * fail on purpose:
 *   adapter : toFlowGraph throws while rendering    -> error boundary
 *   layout  : layoutGraph throws inside the worker  -> worker error reply
 *   render  : the canvas throws after layout        -> error boundary
 *   worker  : the worker script cannot be loaded    -> worker.onerror
 *
 * Each fault fires once per page load, so "Try again" (or switching vendor)
 * can show that the panel recovers. Production builds never read the
 * parameter: `import.meta.env.DEV` is false there and the code is removed.
 */
export type TopologyFaultKind = "adapter" | "layout" | "render" | "worker";

const KINDS = new Set<TopologyFaultKind>(["adapter", "layout", "render", "worker"]);
const consumed = new Set<TopologyFaultKind>();

function requestedFault(): TopologyFaultKind | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("topologyFault");
  return value && KINDS.has(value as TopologyFaultKind)
    ? (value as TopologyFaultKind)
    : null;
}

/** True while the requested fault of this kind has not fired yet. */
export function shouldInjectFault(kind: TopologyFaultKind): boolean {
  return requestedFault() === kind && !consumed.has(kind);
}

/** Marks the requested fault as fired, so the next attempt succeeds. */
export function consumeFault(kind?: TopologyFaultKind): void {
  const fault = kind ?? requestedFault();
  if (fault) consumed.add(fault);
}

export function injectedFaultError(kind: TopologyFaultKind): Error {
  return new Error(`Injected topology ${kind} fault (?topologyFault=${kind})`);
}
