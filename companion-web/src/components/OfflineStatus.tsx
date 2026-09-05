import { useOfflineStatus } from "../hooks/useOfflineStatus";

/**
 * One line in the footer that answers "will this open on the plane?".
 * Green once the service worker has the app cached; gold while actually
 * offline (everything still works — saves never leave the browser).
 */
export function OfflineStatus() {
  const { online, cached, unsupported } = useOfflineStatus();

  if (unsupported) {
    return (
      <div className="text-[var(--ff-faint)]">
        Offline cache unavailable here (dev server or unsupported browser).
      </div>
    );
  }

  if (!online) {
    return (
      <div className="text-[var(--ff-gold)]" role="status">
        OFFLINE · everything here still works; saves stay in this browser.
      </div>
    );
  }

  return cached ? (
    <div className="text-[var(--ff-cyan)]" role="status">
      ✓ Offline ready — this device has the whole companion cached.
    </div>
  ) : (
    <div className="text-[var(--ff-dim)]" role="status">
      Caching for offline use… stay on the page a moment, then reload once.
    </div>
  );
}
