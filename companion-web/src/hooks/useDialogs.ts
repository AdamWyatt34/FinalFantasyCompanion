import { createContext, useContext } from "react";

/** In-app alert/confirm/prompt — see components/dialogs.tsx for the provider. */
export interface Dialogs {
  alert(message: string): Promise<void>;
  confirm(
    message: string,
    options?: { confirmLabel?: string; danger?: boolean },
  ): Promise<boolean>;
  prompt(message: string, initial?: string): Promise<string | null>;
}

export const DialogContext = createContext<Dialogs | null>(null);

export function useDialogs(): Dialogs {
  const dialogs = useContext(DialogContext);
  if (dialogs === null) {
    throw new Error("useDialogs must be used inside a DialogProvider");
  }
  return dialogs;
}
