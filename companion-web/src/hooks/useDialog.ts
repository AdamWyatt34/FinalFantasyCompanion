import { useEffect, useRef } from "react";

/**
 * Minimal dialog behavior for overlay panels: move focus into the panel on
 * mount, dismiss on Escape, and hand focus back to the opener on unmount.
 * Attach the returned ref to the panel div along with
 * `tabIndex={-1} role="dialog" aria-modal="true"` and an aria-label.
 */
export function useDialog(onDismiss: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismissRef.current();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, []);

  return panelRef;
}
