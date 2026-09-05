import { useEffect, useState } from "react";

/** Fired by the service-worker registration once the whole app is precached. */
export const OFFLINE_READY_EVENT = "ffcompanion:offline-ready";

export interface OfflineStatus {
  /** The browser reports a network connection. */
  online: boolean;
  /** A service worker holds the app in its cache, so it opens without a network. */
  cached: boolean;
  /** This browser cannot cache at all (no service worker support, or the dev server). */
  unsupported: boolean;
}

const hasServiceWorker = () =>
  typeof navigator !== "undefined" && "serviceWorker" in navigator;

/**
 * Offline readiness as the player experiences it: whether the app would open
 * with the network off, and whether the network is off right now. Reads the
 * live controller (a reload after the first install) or the precache-complete
 * event (the first install itself), whichever comes first.
 */
export function useOfflineStatus(): OfflineStatus {
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine,
  );
  const [cached, setCached] = useState(
    () => hasServiceWorker() && navigator.serviceWorker.controller !== null,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    const ready = () => setCached(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(OFFLINE_READY_EVENT, ready);
    if (hasServiceWorker()) {
      navigator.serviceWorker.addEventListener("controllerchange", ready);
      // A registration that is already active (a return visit) counts even
      // before it controls this page.
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration?.active) {
            setCached(true);
          }
        })
        .catch(() => {
          // No registration yet — the ready event will say so later.
        });
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(OFFLINE_READY_EVENT, ready);
      if (hasServiceWorker()) {
        navigator.serviceWorker.removeEventListener("controllerchange", ready);
      }
    };
  }, []);

  return { online, cached, unsupported: !hasServiceWorker() };
}
