import { useSyncExternalStore } from "react";

// Below Tailwind's `sm` breakpoint.
const MOBILE_QUERY = "(max-width: 639.98px)";

// matchMedia is missing in some test environments; treat those as desktop.
const mediaQuery = () => window.matchMedia?.(MOBILE_QUERY);

const subscribe = (onChange: () => void) => {
  const query = mediaQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
};

const isMobileNow = () => mediaQuery()?.matches ?? false;

/** True on phone-width screens. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, isMobileNow, () => false);
}
