import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * Registers the service worker and shows a toast when a new deploy is waiting.
 * The new version only takes over when the user taps Refresh — a pinned PWA
 * must never reload mid-session on its own.
 */
export function UpdateToast() {
  const [ready, setReady] = useState(false);
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    update.current = registerSW({
      onNeedRefresh: () => setReady(true),
      onRegisteredSW: (_url, registration) => {
        // A home-screen app can stay open for days; poll for new deploys.
        if (registration) {
          interval = setInterval(() => registration.update(), 60 * 60 * 1000);
        }
      },
    });
    return () => clearInterval(interval);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <div className="fixed bottom-3 inset-x-0 z-50 flex justify-center px-3">
      <div className="ff-box px-3 py-2 flex items-center gap-3 text-xs font-mono">
        <span className="text-[var(--ff-ink)]">A new version is ready.</span>
        <button
          onClick={() => update.current?.(true)}
          className="px-3 py-1 rounded border border-[var(--ff-cyan)]/55 text-[var(--ff-cyan)]"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
