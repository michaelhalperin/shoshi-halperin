import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useI18n } from "../i18n";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-clay-700 disabled:bg-stone-300",
    secondary: "border border-ink/25 text-ink hover:border-ink hover:bg-ink/5 disabled:opacity-40",
    danger: "border border-red-200 text-red-700 hover:border-red-400 hover:bg-red-50 disabled:opacity-40",
    ghost: "text-stone-500 hover:text-ink hover:bg-ink/5 disabled:opacity-40",
  }[variant];
  return (
    <button
      className={`rounded-full px-5 py-2 text-[13px] font-semibold uppercase tracking-[0.12em] transition-all cursor-pointer disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    />
  );
}

export function Input({ label, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {label}
        </span>
      )}
      <input
        className={`w-full border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors placeholder:text-stone-400 focus:border-ink ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {label}
        </span>
      )}
      <textarea
        rows={3}
        className={`w-full border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors placeholder:text-stone-400 focus:border-ink ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {label}
        </span>
      )}
      <select
        className={`w-full border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors focus:border-ink disabled:text-stone-400 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border border-stone-200 bg-white p-5 ${className}`}>{children}</div>;
}

export function Badge({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "green" | "red" | "stone";
}) {
  const styles = {
    amber: "text-clay-700 border-clay-200 bg-clay-50",
    green: "text-emerald-800 border-emerald-200 bg-emerald-50",
    red: "text-red-700 border-red-200 bg-red-50",
    stone: "text-stone-500 border-stone-200 bg-stone-50",
  }[tone];
  return (
    <span
      className={`inline-block border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${styles}`}
    >
      {children}
    </span>
  );
}

export function OrnamentalDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`mx-auto flex items-center justify-center ${className}`} aria-hidden>
      <span className="h-px w-14 bg-gradient-to-r from-transparent via-clay-300 to-clay-400 sm:w-20" />
      <span className="mx-2 h-1 w-1 rounded-full bg-clay-300" />
      <svg className="text-clay-400" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path
          d="M11 2.5 18.5 11 11 19.5 3.5 11Z"
          stroke="currentColor"
          strokeWidth="0.75"
          fill="var(--color-clay-100)"
        />
        <circle cx="11" cy="11" r="2" fill="currentColor" />
      </svg>
      <span className="mx-2 h-1 w-1 rounded-full bg-clay-300" />
      <span className="h-px w-14 bg-gradient-to-l from-transparent via-clay-300 to-clay-400 sm:w-20" />
    </div>
  );
}

export function Spinner() {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-sm uppercase tracking-[0.2em] text-stone-400">
      <span className="h-4 w-4 animate-spin rounded-full border border-stone-400 border-t-transparent" />
      {t("loading")}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="border-s-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>
  );
}

export function ConfirmModal({
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel,
  busy = false,
  error,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  busy?: boolean;
  error?: string;
}) {
  const { t } = useI18n();
  return (
    <Modal title={title} onClose={onClose} disableClose={busy}>
      <p className="font-light text-stone-600">{message}</p>
      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={busy}>
          {confirmLabel ?? t("delete")}
        </Button>
      </div>
    </Modal>
  );
}

export function Modal({
  title,
  onClose,
  children,
  disableClose = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  disableClose?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const disableCloseRef = useRef(disableClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    disableCloseRef.current = disableClose;
  }, [disableClose]);

  const requestClose = useCallback(() => {
    if (closingRef.current || disableCloseRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => onCloseRef.current(), 180);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 ${
        closing ? "modal-backdrop-out" : "modal-backdrop-in"
      }`}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`max-h-[92vh] w-full overflow-y-auto bg-paper p-6 sm:max-w-lg sm:p-8 ${
          closing ? "modal-panel-out" : "modal-panel-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="modal-title" className="font-display text-2xl font-semibold text-ink">
            {title}
          </h2>
          <button
            onClick={requestClose}
            className="p-1 text-stone-400 transition-colors hover:text-ink"
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const courseColors: Record<string, string> = {
  amber: "bg-clay-500",
  rose: "bg-rose-400",
  teal: "bg-teal-600",
  violet: "bg-violet-400",
  sky: "bg-sky-600",
};

const courseGradients: Record<string, string> = {
  amber: "from-clay-200 via-clay-100 to-paper",
  rose: "from-rose-200 via-rose-100 to-paper",
  teal: "from-teal-200 via-teal-100 to-paper",
  violet: "from-violet-200 via-violet-100 to-paper",
  sky: "from-sky-200 via-sky-100 to-paper",
};

export function CourseImage({
  imageUrl,
  color,
  alt,
  className = "",
}: {
  imageUrl?: string | null;
  color: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const gradient = courseGradients[color] ?? courseGradients.amber;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} ${className}`}>
      {imageUrl && !failed && (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
    </div>
  );
}
