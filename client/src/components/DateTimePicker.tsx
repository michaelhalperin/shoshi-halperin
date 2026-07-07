import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { formatDateTime, useI18n, type Lang } from "../i18n";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalValue(date: Date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function fromLocalValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekStart(lang: Lang) {
  return lang === "he" ? 0 : 1;
}

function buildCalendarDays(year: number, month: number, lang: Lang) {
  const first = new Date(year, month, 1);
  const start = weekStart(lang);
  const offset = (first.getDay() - start + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < offset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function weekdayLabels(lang: Lang) {
  const locale = lang === "he" ? "he-IL" : "en-GB";
  const start = weekStart(lang);
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, start === 1 ? 1 + i : i);
    labels.push(formatter.format(d));
  }
  return labels;
}

function monthLabel(year: number, month: number, lang: Lang) {
  return new Date(year, month, 1).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

export function DateTimePicker({
  label,
  value,
  onChange,
  required,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  const { lang, t } = useI18n();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const selected = fromLocalValue(value) ?? new Date();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    if (!open) return;
    const d = fromLocalValue(value) ?? new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, value]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(288, window.innerWidth - 32);
      const panelHeight = panel?.offsetHeight ?? 340;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < panelHeight + 12 && rect.top > panelHeight + 12;
      const left = Math.min(Math.max(16, rect.left), window.innerWidth - panelWidth - 16);

      setPanelStyle({
        position: "fixed",
        left,
        width: panelWidth,
        top: openUp ? rect.top - 8 : rect.bottom + 8,
        transform: openUp ? "translateY(-100%)" : undefined,
        zIndex: 100,
      });
    };

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, viewMonth, viewYear]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const update = (date: Date) => {
    onChange(toLocalValue(date));
  };

  const setDatePart = (year: number, month: number, day: number) => {
    const base = fromLocalValue(value) ?? new Date();
    const next = new Date(base);
    next.setFullYear(year, month, day);
    update(next);
  };

  const setTimePart = (hour: number, minute: number) => {
    const base = fromLocalValue(value) ?? new Date();
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);
    update(next);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const current = fromLocalValue(value);
  const hours = current?.getHours() ?? 10;
  const minutes = current?.getMinutes() ?? 0;
  const days = buildCalendarDays(viewYear, viewMonth, lang);
  const weekdays = weekdayLabels(lang);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div ref={rootRef} className={`relative block ${className}`}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {label}
        </span>
      )}

      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 border-b border-stone-300 bg-transparent px-0.5 py-2 text-start text-[15px] outline-none transition-colors hover:border-stone-400 focus:border-ink ${
          value ? "text-ink" : "text-stone-400"
        }`}
      >
        <span className="min-w-0 truncate">
          {value ? formatDateTime(new Date(value).toISOString(), lang) : t("dateTimePlaceholder")}
        </span>
        <span className="shrink-0 text-stone-400">
          <CalendarIcon />
        </span>
      </button>

      <input
        tabIndex={-1}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={value}
        required={required}
        onChange={() => {}}
        aria-hidden
      />

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-labelledby={id}
            style={panelStyle}
            className="datepicker-panel-in border border-stone-200 bg-paper p-4 shadow-lg shadow-ink/10"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
                aria-label={t("prevMonth")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="font-display text-lg font-semibold text-ink">{monthLabel(viewYear, viewMonth, lang)}</span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
                aria-label={t("nextMonth")}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekdays.map((name) => (
                <span
                  key={name}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-stone-400"
                >
                  {name}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} />;
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const isSelected =
                  current &&
                  day.getFullYear() === current.getFullYear() &&
                  day.getMonth() === current.getMonth() &&
                  day.getDate() === current.getDate();
                const isToday = dayStart.getTime() === today.getTime();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setDatePart(day.getFullYear(), day.getMonth(), day.getDate())}
                    className={`flex h-9 w-full items-center justify-center rounded-full text-sm transition-colors ${
                      isSelected
                        ? "bg-ink font-semibold text-paper"
                        : isToday
                          ? "font-semibold text-clay-700 ring-1 ring-clay-300 hover:bg-clay-50"
                          : "text-ink hover:bg-stone-100"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-stone-200 pt-4">
              <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                {t("pickTime")}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={hours}
                  onChange={(e) => setTimePart(Number(e.target.value), minutes)}
                  className="min-w-0 flex-1 border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors focus:border-ink"
                  aria-label={t("pickTime")}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {pad(hour)}
                    </option>
                  ))}
                </select>
                <span className="text-stone-400">:</span>
                <select
                  value={minutes}
                  onChange={(e) => setTimePart(hours, Number(e.target.value))}
                  className="min-w-0 flex-1 border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors focus:border-ink"
                  aria-label={t("pickTime")}
                >
                  {Array.from({ length: 60 }, (_, minute) => (
                    <option key={minute} value={minute}>
                      {pad(minute)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
