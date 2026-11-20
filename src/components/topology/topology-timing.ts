/**
 * NWP-TOPO-006 subtask: dev-only timing for the topology pipeline, to support
 * the AC1 measurement (rendering within 30 s for at least 95% of requests)
 * without a test harness.
 *
 * Every rendered plan logs one "[topology-timing]" line with:
 *   adapterMs     toFlowGraph (main thread)
 *   layoutMs      layoutGraph inside the worker
 *   workerMs      post to worker → result back (includes worker start-up)
 *   renderMs      result back → React Flow initialised and painted
 *   totalMs       plan received by the panel → first painted diagram
 *
 * Samples also collect on window.__NWP_TOPOLOGY_TIMINGS__, and
 * window.__nwpTopologyTimingSummary() prints the count, median, p95 and
 * the share under 30 s. In production builds every function here is a no-op
 * (import.meta.env.DEV is false and Vite drops the bodies).
 *
 * These cover only the browser side. The engine's time to return the plan is
 * measured on the backend and is added to totalMs for the end-to-end figure.
 */

import { toFlowGraph } from "./adapter";
import type { FlowGraphResult, TopologyPlan } from "./types";

export interface TopologyTimingSample {
  key: string;
  nodes: number;
  edges: number;
  adapterMs: number;
  layoutMs: number | null;
  workerMs: number;
  renderMs: number;
  totalMs: number;
  at: string;
}

const MAX_SAMPLES = 500;
export const TOPOLOGY_TARGET_MS = 30_000;

declare global {
  interface Window {
    __NWP_TOPOLOGY_TIMINGS__?: TopologyTimingSample[];
    __nwpTopologyTimingSummary?: () => unknown;
  }
}

const round = (ms: number) => Math.round(ms * 10) / 10;

export const timingNow = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function summary() {
  const samples = window.__NWP_TOPOLOGY_TIMINGS__ ?? [];
  const totals = samples.map((s) => s.totalMs).sort((a, b) => a - b);
  const underTarget = totals.filter((t) => t <= TOPOLOGY_TARGET_MS).length;
  const result = {
    samples: totals.length,
    medianMs: round(percentile(totals, 0.5)),
    p95Ms: round(percentile(totals, 0.95)),
    maxMs: round(totals[totals.length - 1] ?? 0),
    shareUnder30s: totals.length ? underTarget / totals.length : null,
  };
  console.table(result);
  return result;
}

export function recordTopologyTiming(
  sample: Omit<TopologyTimingSample, "at">,
): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  const entry: TopologyTimingSample = {
    ...sample,
    adapterMs: round(sample.adapterMs),
    layoutMs: sample.layoutMs === null ? null : round(sample.layoutMs),
    workerMs: round(sample.workerMs),
    renderMs: round(sample.renderMs),
    totalMs: round(sample.totalMs),
    at: new Date().toISOString(),
  };

  const list = (window.__NWP_TOPOLOGY_TIMINGS__ ??= []);
  list.push(entry);
  if (list.length > MAX_SAMPLES) list.splice(0, list.length - MAX_SAMPLES);
  window.__nwpTopologyTimingSummary ??= summary;

  console.info("[topology-timing]", entry);
}

/**
 * Runs the TOPO-001 adapter and notes when it started and how long it took.
 * The timestamps are plain values on the result, so the component stays free
 * of clock reads during render. In production they cost two performance.now()
 * calls per plan and are never logged.
 */
export function adaptWithTiming(plan: TopologyPlan): {
  graph: FlowGraphResult;
  startedAt: number;
  adapterMs: number;
} {
  const startedAt = timingNow();
  const graph = toFlowGraph(plan);
  return { graph, startedAt, adapterMs: timingNow() - startedAt };
}
