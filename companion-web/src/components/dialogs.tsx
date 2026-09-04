import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDialog } from "../hooks/useDialog";
import { DialogContext, type Dialogs } from "../hooks/useDialogs";
import { STATUS } from "../theme/statusColors";

/**
 * In-app replacements for window.alert/confirm/prompt. The browser versions
 * are unreliable in a pinned PWA (iOS standalone swallows some, Android
 * WebViews style them unpredictably) and they ignore the pack theme. Calls
 * queue: a second request waits for the first panel to close.
 */
type Request =
  | { id: number; kind: "alert"; message: string; resolve: () => void }
  | {
      id: number;
      kind: "confirm";
      message: string;
      confirmLabel: string;
      danger: boolean;
      resolve: (ok: boolean) => void;
    }
  | {
      id: number;
      kind: "prompt";
      message: string;
      initial: string;
      resolve: (text: string | null) => void;
    };

let nextId = 1;

export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([]);
  const push = useCallback((request: Request) => {
    setQueue((q) => [...q, request]);
  }, []);

  const dialogs = useMemo<Dialogs>(
    () => ({
      alert: (message) =>
        new Promise((resolve) =>
          push({ id: nextId++, kind: "alert", message, resolve }),
        ),
      confirm: (message, options = {}) =>
        new Promise((resolve) =>
          push({
            id: nextId++,
            kind: "confirm",
            message,
            confirmLabel: options.confirmLabel ?? "OK",
            danger: options.danger ?? false,
            resolve,
          }),
        ),
      prompt: (message, initial = "") =>
        new Promise((resolve) =>
          push({ id: nextId++, kind: "prompt", message, initial, resolve }),
        ),
    }),
    [push],
  );

  const current = queue[0];
  const finish = () => setQueue((q) => q.slice(1));

  return (
    <DialogContext.Provider value={dialogs}>
      {children}
      {current !== undefined && (
        <DialogPanel key={current.id} request={current} onDone={finish} />
      )}
    </DialogContext.Provider>
  );
}

function DialogPanel({
  request,
  onDone,
}: {
  request: Request;
  onDone: () => void;
}) {
  const [text, setText] = useState(
    request.kind === "prompt" ? request.initial : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const settle = (action: "ok" | "cancel") => {
    switch (request.kind) {
      case "alert":
        request.resolve();
        break;
      case "confirm":
        request.resolve(action === "ok");
        break;
      case "prompt":
        request.resolve(action === "ok" ? text : null);
        break;
    }
    onDone();
  };

  // Escape and backdrop taps mean cancel — dismissing must never confirm.
  const panelRef = useDialog(() => settle("cancel"));

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirmColor =
    request.kind === "confirm" && request.danger
      ? STATUS.lastChance.color
      : null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-black/70"
      onClick={() => settle("cancel")}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role={request.kind === "alert" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-label={request.message}
        className="ff-box p-4 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm leading-snug text-[var(--ff-ink)] whitespace-pre-line">
          {request.message}
        </div>

        {request.kind === "prompt" && (
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              settle("ok");
            }}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Your text"
              className="w-full bg-transparent text-sm px-3 py-1.5 rounded border border-[var(--ff-bevel)] text-[var(--ff-ink)] focus:border-[var(--ff-cyan)] focus:outline-none"
            />
          </form>
        )}

        <div className="flex gap-2 mt-4 justify-end">
          {request.kind !== "alert" && (
            <button
              onClick={() => settle("cancel")}
              className="text-xs font-mono px-3 py-2 rounded border border-[var(--ff-button-border)] text-[var(--ff-dim)]"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => settle("ok")}
            autoFocus={request.kind !== "prompt"}
            className="text-xs font-mono px-4 py-2 rounded border"
            style={
              confirmColor !== null
                ? { borderColor: `${confirmColor}88`, color: confirmColor }
                : {
                    borderColor: "var(--ff-cyan)",
                    color: "var(--ff-cyan)",
                    background: "color-mix(in srgb, var(--ff-cyan) 10%, transparent)",
                  }
            }
          >
            {request.kind === "confirm" ? request.confirmLabel : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
