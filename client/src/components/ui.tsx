import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useI18n } from "../i18n";

let openModalCount = 0;

function lockBodyScroll() {
  openModalCount += 1;
  document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.style.overflow = "";
  }
}

function CourseLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function LinkedCourseLink({
  courseId,
  courseTitle,
  className = "",
}: {
  courseId: string;
  courseTitle: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <Link
      to={`/courses/${courseId}`}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 underline-offset-2 transition-colors hover:text-clay-800 hover:underline ${className}`}
    >
      <CourseLinkIcon />
      <span>
        {t("linkedCourse")}: {courseTitle}
      </span>
    </Link>
  );
}

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
        className={`w-full border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors placeholder:text-stone-400 focus:border-ink disabled:cursor-not-allowed disabled:text-stone-400 disabled:opacity-60 ${className}`}
        {...props}
      />
    </label>
  );
}

type WebImageResult = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  downloadLocation: string;
  photographer: string;
  photographerUrl: string;
};

export function ImageUpload({
  label,
  folder,
  value,
  onChange,
  color = "amber",
  searchQuery,
}: {
  label: string;
  folder: "courses" | "recipes" | "gallery" | "gallery-posters" | "testimonials" | "testimonial-posters" | "about";
  value: string;
  onChange: (url: string) => void;
  color?: string;
  /** When set, enables “Find on web” using this query (usually the title). */
  searchQuery?: string;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [results, setResults] = useState<WebImageResult[]>([]);
  const [pickerError, setPickerError] = useState("");
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const busy = uploading || searching || Boolean(importingId);
  const titleQuery = searchQuery?.trim() ?? "";

  const closePicker = () => {
    if (importingId) return;
    setPickerOpen(false);
    setPickerError("");
  };

  const upload = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const result = await api.upload<{ url: string }>("/api/admin/upload", formData);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setPickerError(t("imageSearchNeedQuery"));
      setResults([]);
      return;
    }

    setPickerError("");
    setResults([]);
    setSearching(true);
    try {
      const data = await api.post<{ images: WebImageResult[] }>("/api/admin/images/search", {
        query: trimmed,
      });
      setResults(data.images);
      if (data.images.length === 0) {
        setPickerError(t("imageSearchEmpty"));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setPickerError(t("imageSearchNotConfigured"));
      } else {
        setPickerError(err instanceof ApiError ? err.message : t("errorGeneric"));
      }
    } finally {
      setSearching(false);
    }
  };

  const openPicker = () => {
    setError("");
    setPickerError("");
    setResults([]);
    setCustomQuery(titleQuery);
    setPickerOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 50);
    if (titleQuery) {
      void runSearch(titleQuery);
    }
  };

  const importWeb = async (image: WebImageResult) => {
    setPickerError("");
    setImportingId(image.id);
    try {
      const result = await api.post<{ url: string }>("/api/admin/images/import", {
        imageUrl: image.fullUrl,
        downloadLocation: image.downloadLocation,
        folder,
      });
      onChange(result.url);
      setPickerOpen(false);
      setResults([]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setPickerError(t("imageSearchNotConfigured"));
      } else {
        setPickerError(err instanceof ApiError ? err.message : t("errorGeneric"));
      }
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <CourseImage
          imageUrl={value || null}
          color={color}
          alt=""
          className="mx-auto h-24 w-full max-w-[8rem] sm:mx-0 sm:w-32 sm:max-w-none"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="w-full sm:w-auto sm:shrink-0"
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? t("uploading") : value ? t("replaceImage") : t("uploadImage")}
            </Button>
            {searchQuery !== undefined && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="w-full sm:w-auto sm:shrink-0"
                onClick={openPicker}
              >
                {searching ? t("findingImages") : t("findImageOnWeb")}
              </Button>
            )}
            {value && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                className="w-full sm:w-auto sm:shrink-0"
                onClick={() => setConfirmRemove(true)}
              >
                {t("removeImage")}
              </Button>
            )}
          </div>
          {value && (
            <p className="break-all text-xs font-light text-stone-400">{value}</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      {pickerOpen && (
        <Modal
          title={t("chooseWebImage")}
          onClose={closePicker}
          disableClose={Boolean(importingId)}
          stacked
          size="lg"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                {t("searchImages")}
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={customQuery}
                onChange={(event) => setCustomQuery(event.target.value)}
                onKeyDown={(event) => {
                  // Portals still bubble through the React tree — stop Enter from
                  // submitting the parent recipe form and closing this modal.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!searching && !importingId && customQuery.trim()) {
                      void runSearch(customQuery);
                    }
                  }
                }}
                placeholder={t("imageSearchPlaceholder")}
                disabled={Boolean(importingId)}
                className="w-full border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors placeholder:text-stone-400 focus:border-ink disabled:opacity-60"
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              disabled={searching || Boolean(importingId) || !customQuery.trim()}
              className="w-full shrink-0 sm:w-auto"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void runSearch(customQuery);
              }}
            >
              {searching ? t("findingImages") : t("searchImages")}
            </Button>
          </div>

          {searching && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-clay-200 border-t-clay-600" />
              <p className="text-sm font-medium text-clay-700">{t("findingImages")}</p>
            </div>
          )}

          {!searching && pickerError && (
            <div className="py-6">
              <ErrorNote message={pickerError} />
            </div>
          )}

          {!searching && !pickerError && results.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {results.map((image) => {
                const importing = importingId === image.id;
                return (
                  <button
                    key={image.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void importWeb(image)}
                    className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-100 text-start transition-all hover:border-clay-500 hover:shadow-[0_12px_32px_rgba(33,29,25,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <img
                      src={image.fullUrl}
                      alt=""
                      className="aspect-[3/2] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-ink/75 via-ink/35 to-transparent px-4 pb-3 pt-14">
                      <span className="text-sm font-medium text-paper">
                        {importing ? t("importingImage") : `${t("photoBy")} ${image.photographer}`}
                      </span>
                      {!importing && (
                        <span className="shrink-0 rounded-full bg-paper/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          {t("chooseWebImage")}
                        </span>
                      )}
                    </span>
                    {importing && (
                      <span className="absolute inset-0 flex items-center justify-center bg-paper/55 backdrop-blur-[1px]">
                        <span className="h-9 w-9 animate-spin rounded-full border-2 border-clay-200 border-t-clay-600" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!searching && !pickerError && results.length === 0 && !customQuery.trim() && (
            <p className="py-10 text-center text-sm font-light text-stone-500">
              {t("imageSearchNeedQuery")}
            </p>
          )}
        </Modal>
      )}

      {confirmRemove && (
        <ConfirmModal
          title={t("removeImage")}
          message={t("confirmRemoveImage")}
          confirmLabel={t("removeImage")}
          onClose={() => setConfirmRemove(false)}
          onConfirm={() => {
            onChange("");
            setConfirmRemove(false);
          }}
        />
      )}
    </div>
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

function parseListValue(value: string): string[] {
  if (!value.trim()) return [""];
  return value.split("\n");
}

function joinListValue(items: string[]): string {
  return items.join("\n");
}

export function ListEditor({
  label,
  value,
  onChange,
  variant = "bullet",
  placeholder,
  addLabel,
  removeLabel,
  dir,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  variant?: "bullet" | "numbered";
  placeholder?: string;
  addLabel: string;
  removeLabel: string;
  dir?: "rtl" | "ltr";
  className?: string;
}) {
  const items = parseListValue(value);

  const updateItem = (index: number, text: string) => {
    const next = [...items];
    next[index] = text;
    onChange(joinListValue(next));
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(joinListValue(next.length > 0 ? next : [""]));
  };

  const addItem = () => {
    onChange(joinListValue([...items, ""]));
  };

  return (
    <div className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {label}
        </span>
      )}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {variant === "numbered" ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-100 text-xs font-semibold text-clay-700">
                {index + 1}
              </span>
            ) : (
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" aria-hidden />
            )}
            <input
              type="text"
              dir={dir}
              value={item}
              placeholder={placeholder}
              onChange={(e) => updateItem(index, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (index === items.length - 1) addItem();
                }
              }}
              className="min-w-0 flex-1 border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors placeholder:text-stone-400 focus:border-ink"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={items.length === 1 && !item.trim()}
              className="shrink-0 p-1 text-stone-400 transition-colors hover:text-red-600 disabled:invisible"
              aria-label={removeLabel}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <circle cx="10" cy="10" r="7" />
                <path d="M7 10h6" strokeLinecap="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addItem}
        className="mt-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-clay-600 transition-colors hover:text-clay-800"
      >
        + {addLabel}
      </button>
    </div>
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

const modalSizeClass = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-3xl",
  lg: "sm:max-w-5xl",
} as const;

export function ModalActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col-reverse gap-2 border-t border-stone-200/80 bg-paper/95 px-4 pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:-mx-8 sm:flex-row sm:justify-end sm:px-8 sm:pb-1 ${className}`}
    >
      {children}
    </div>
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
    <Modal title={title} onClose={onClose} disableClose={busy} stacked size="sm">
      <p className="font-light leading-relaxed text-stone-600">{message}</p>
      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}
      <ModalActions>
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy} className="w-full sm:w-auto">
          {t("cancel")}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={busy} className="w-full sm:w-auto">
          {confirmLabel ?? t("delete")}
        </Button>
      </ModalActions>
    </Modal>
  );
}

export function Modal({
  title,
  onClose,
  children,
  disableClose = false,
  stacked = false,
  size = "md",
  overlay,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  disableClose?: boolean;
  stacked?: boolean;
  size?: keyof typeof modalSizeClass;
  overlay?: ReactNode;
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
    lockBodyScroll();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  return createPortal(
    <div
      className={`fixed inset-0 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6 ${
        stacked ? "z-[60]" : "z-50"
      } ${closing ? "modal-backdrop-out" : "modal-backdrop-in"}`}
      onClick={requestClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-2xl bg-paper shadow-[0_-12px_40px_rgba(33,29,25,0.12)] sm:max-h-[min(90dvh,960px)] sm:rounded-2xl sm:shadow-[0_28px_80px_rgba(33,29,25,0.18)] sm:ring-1 sm:ring-ink/8 ${
          modalSizeClass[size]
        } ${closing ? "modal-panel-out" : "modal-panel-in"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-200/70 px-4 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5">
          <h2 id="modal-title" className="font-display text-xl font-semibold leading-snug text-ink sm:text-2xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={disableClose}
            className="-me-1 -mt-1 shrink-0 rounded-full p-2 text-stone-400 transition-colors hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div
          className={`relative min-h-0 flex-1 overscroll-contain px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-6 sm:pb-6 ${
            overlay ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
          {overlay}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ImageEmptyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M3 16l4.5-4.5a1 1 0 0 1 1.4 0L14 17l2.3-2.3a1 1 0 0 1 1.4 0L21 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FadeInImage({
  src,
  alt,
  loading = "lazy",
  className = "",
  style,
  onError,
}: {
  src: string;
  alt: string;
  loading?: "lazy" | "eager";
  className?: string;
  style?: CSSProperties;
  onError?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  if (failed) return null;

  return (
    <>
      {!loaded && <div className="image-skeleton absolute inset-0" aria-hidden />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        referrerPolicy="no-referrer"
        style={style}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          onError?.();
        }}
        className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

export function CourseImage({
  imageUrl,
  color: _color,
  alt,
  className = "",
}: {
  imageUrl?: string | null;
  color: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-[#f0ece6] ${className}`}>
      {imageUrl && !failed ? (
        <FadeInImage
          src={imageUrl}
          alt={alt}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-stone-300" aria-hidden>
          <ImageEmptyIcon />
        </div>
      )}
    </div>
  );
}
