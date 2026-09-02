"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Toasts.
 *
 * Admin UX rule 2 (docs/06 § 11): never a silent failure. Every mutation
 * produces one of these, and a failure carries a retry.
 *
 * Hand-rolled rather than another Radix package: the whole surface is "push a
 * message, optionally with one action", and the accessibility contract is a
 * single polite live region plus a focusable dismiss. An assertive region is
 * used for errors only — a success toast interrupting a screen-reader mid-word
 * is worse than a slightly late one.
 */

export type ToastTone = "success" | "error" | "info";

export type ToastAction = { label: string; onClick: () => void };

export type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (message: string) => void;
  error: (message: string, action?: ToastAction) => void;
  dismiss: (id: number) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Errors stay until dismissed; a message you cannot re-read is not a message. */
const DURATION: Record<ToastTone, number | null> = {
  success: 4000,
  info: 6000,
  error: null,
};

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { ...input, id }]);

      const ms = DURATION[input.tone];
      if (ms !== null) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), ms),
        );
      }
    },
    [dismiss],
  );

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (message) => toast({ tone: "success", message }),
      error: (message, action) => toast({ tone: "error", message, action }),
    }),
    [toast, dismiss],
  );

  const polite = toasts.filter((t) => t.tone !== "error");
  const assertive = toasts.filter((t) => t.tone === "error");

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Bottom on mobile so a toast never covers the sticky action bar's
          label; bottom-right from 640px. safe-bottom clears the iOS home bar. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 px-4 pb-4 safe-bottom sm:inset-x-auto sm:right-4 sm:items-end">
        <ToastRegion toasts={assertive} live="assertive" onDismiss={dismiss} />
        <ToastRegion toasts={polite} live="polite" onDismiss={dismiss} />
      </div>
    </ToastContext.Provider>
  );
}

function ToastRegion({
  toasts,
  live,
  onDismiss,
}: {
  toasts: Toast[];
  live: "polite" | "assertive";
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live={live}
      aria-atomic="false"
      className="flex w-full flex-col gap-2 sm:w-auto"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: "border-success/40 bg-success-bg text-foreground",
  error: "border-danger/40 bg-danger-bg text-foreground",
  info: "border-info/40 bg-info-bg text-foreground",
};

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

const TONE_ICON_COLOR: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-info",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const Icon = TONE_ICON[toast.tone];

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg sm:w-96",
        TONE_STYLES[toast.tone],
      )}
    >
      <Icon
        className={cn("mt-0.5 size-5 shrink-0", TONE_ICON_COLOR[toast.tone])}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm leading-relaxed">{toast.message}</p>
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className={cn(
              "self-start rounded-sm text-sm font-semibold text-accent-quiet underline underline-offset-4",
              "hover:text-foreground",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            )}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className={cn(
          "-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md",
          "text-foreground-muted transition-colors duration-(--dur-fast)",
          "hover:bg-surface hover:text-foreground",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
