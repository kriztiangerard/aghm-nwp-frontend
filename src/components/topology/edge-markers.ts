import { createContext } from 'react';
import type { EdgeVariant } from './edge-style';

/**
 * NWP-TOPO-003: id prefix for the themed arrow markers of one canvas.
 *
 * Each canvas gets its own prefix, so the side-by-side plan panels and the
 * expanded dialog never share marker ids. Kept out of the .tsx component
 * files so they export only components (react-refresh/only-export-components).
 */
export const TopologyMarkerContext = createContext('topology');

export const markerId = (prefix: string, variant: EdgeVariant) =>
  `${prefix}-arrow-${variant}`;