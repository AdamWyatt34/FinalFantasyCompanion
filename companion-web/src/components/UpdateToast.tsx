import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { OFFLINE_READY_EVENT } from "../hooks/useOfflineStatus";

/**
 * Registers the service worker and shows a toast when a new deploy is waiting.
 * The new version only takes over when the user taps Refresh — a pinned PWA
 * must never reload mid-session on its own. A second toast confirms the first
 * install finished precaching: from that moment the app opens without a network.
 */
export function UpdateToast() {
  const [ready, setReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    update.current = registerSW({
      onNeedRefresh: () => setReady(true),
      onOfflineReady: () => {
        setOfflineReady(true);
        window.dispatchEvent(new Event(OFFLINE_READY_EVENT));
      },
      onRegisteredSW: (_url, registration) => {
        // A home-screen app can stay open for days; poll for new deploys.
        if (registration) {
          interval = setInterval(() => registration.update(), 60 * 60 * 1000);
        }
      },
    });
    return () => clearInterval(interval);
  }, []);

  // The offline-ready note is informational: let it go away on its own.
  useEffect(() => {
    if (!offlineReady) {
      return;
    }
    const timer = setTimeout(() => setOfflineReady(false), 8000);
    return () => clearTimeout(timer);
  }, [offlineReady]);

  if (!ready && !offlineReady) {
    return null;
  }

  return (
    <div className="fixed bottom-3 inset-x-0 z-50 flex flex-col items-center gap-2 px-3">
      {offlineReady && (
        <div
          className="ff-box px-3 py-2 flex items-center gap-3 text-xs font-mono"
          role="status"
        >
          <span className="text-[var(--ff-cyan)]">
            ✓ Ready to use offline — the whole companion is cached on this device.
          </span>
          <button
            onClick={() => setOfflineReady(false)}
            aria-label="Dismiss"
            className="text-[var(--ff-dim)]"
          >
            ✕
          </button>
        </div>
      )}
      {ready && (
        <div className="ff-box px-3 py-2 flex items-center gap-3 text-xs font-mono">
          <span className="text-[var(--ff-ink)]">A new version is ready.</span>
          <button
            onClick={() => update.current?.(true)}
            className="px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
