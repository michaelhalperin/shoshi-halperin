import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isBeforeDay(day: Date, minDate: Date) {
  return startOfDay(day).getTime() < startOfDay(minDate).getTime();
}

function clampToMin(date: Date, minDate: Date) {
  return date.getTime() < minDate.getTime() ? new Date(minDate) : date;
}

function defaultPickerDate(minDate: Date) {
  const next = new Date(minDate);
  next.setSeconds(0, 0);
  if (next.getTime() < minDate.getTime()) {
    next.setMinutes(next.getMinutes() + 1, 0, 0);
  }
  return next;
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

function useIsMobilePicker() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

const PANEL_GAP = 8;
const VIEWPORT_MARGIN = 16;
const PANEL_MAX_WIDTH = 320;
const PANEL_ESTIMATED_HEIGHT = 380;

function getViewportBounds() {
  const viewport = window.visualViewport;
  const offsetTop = viewport?.offsetTop ?? 0;
  const offsetLeft = viewport?.offsetLeft ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;

  return {
    top: offsetTop + VIEWPORT_MARGIN,
    left: offsetLeft + VIEWPORT_MARGIN,
    right: offsetLeft + width - VIEWPORT_MARGIN,
    bottom: offsetTop + height - VIEWPORT_MARGIN,
    width: Math.max(0, width - VIEWPORT_MARGIN * 2),
    height: Math.max(0, height - VIEWPORT_MARGIN * 2),
  };
}

function computePanelPosition(trigger: DOMRect, panelWidth: number, panelHeight: number) {
  const bounds = getViewportBounds();
  const width = Math.min(panelWidth, bounds.width);

  let left = trigger.left;
  if (left + width > bounds.right) left = bounds.right - width;
  if (left < bounds.left) left = bounds.left;

  const spaceBelow = bounds.bottom - trigger.bottom - PANEL_GAP;
  const spaceAbove = trigger.top - bounds.top - PANEL_GAP;
  const fitsBelow = spaceBelow >= panelHeight;
  const fitsAbove = spaceAbove >= panelHeight;
  const openBelow = fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove);

  let top: number;
  let maxHeight: number;

  if (openBelow) {
    top = trigger.bottom + PANEL_GAP;
    maxHeight = bounds.bottom - top;
  } else {
    top = trigger.top - PANEL_GAP - panelHeight;
    if (top < bounds.top) top = bounds.top;
    maxHeight = trigger.top - PANEL_GAP - top;
  }

  maxHeight = Math.min(maxHeight, panelHeight);
  maxHeight = Math.max(maxHeight, Math.min(220, bounds.height));

  return { left, top, width, maxHeight };
}

export function DateTimePicker({
  label,
  value,
  onChange,
  required,
  disablePast = true,
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disablePast?: boolean;
  className?: string;
}) {
  const { lang, t } = useI18n();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobilePicker();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [minDate, setMinDate] = useState(() => new Date());

  const selected = fromLocalValue(value) ?? defaultPickerDate(minDate);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setMinDate(now);
    const d = fromLocalValue(value) ?? defaultPickerDate(now);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, value]);

  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const panelHeight = panel?.offsetHeight ?? PANEL_ESTIMATED_HEIGHT;
      const { left, top, width, maxHeight } = computePanelPosition(
        rect,
        PANEL_MAX_WIDTH,
        panelHeight
      );

      setPanelStyle({
        position: "fixed",
        left,
        top,
        width,
        maxHeight,
        overflowY: "auto",
        zIndex: 80,
      });
    };

    let resizeObserver: ResizeObserver | null = null;

    updatePosition();
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
      const mountedPanel = panelRef.current;
      if (mountedPanel && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(updatePosition);
        resizeObserver.observe(mountedPanel);
      }
    });

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [open, isMobile, viewMonth, viewYear]);

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
    const next = disablePast ? clampToMin(date, minDate) : date;
    onChange(toLocalValue(next));
  };

  const setDatePart = (year: number, month: number, day: number) => {
    const base = fromLocalValue(value) ?? defaultPickerDate(minDate);
    const next = new Date(base);
    next.setFullYear(year, month, day);
    update(next);
  };

  const setTimePart = (hour: number, minute: number) => {
    const base = fromLocalValue(value) ?? defaultPickerDate(minDate);
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);
    update(next);
  };

  const shiftMonth = (delta: number) => {
    const nextView = new Date(viewYear, viewMonth + delta, 1);
    if (disablePast) {
      const earliest = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      if (nextView < earliest) return;
    }
    setViewYear(nextView.getFullYear());
    setViewMonth(nextView.getMonth());
  };

  const current = fromLocalValue(value);
  const selectedDay = current ?? defaultPickerDate(minDate);
  const hours = selectedDay.getHours();
  const minutes = selectedDay.getMinutes();
  const isTodaySelected = disablePast && isSameDay(selectedDay, minDate);
  const minHour = isTodaySelected ? minDate.getHours() : 0;
  const minMinute = isTodaySelected && hours === minHour ? minDate.getMinutes() : 0;
  const displayHours = isTodaySelected ? Math.max(hours, minHour) : hours;
  const displayMinutes =
    isTodaySelected && displayHours === minHour ? Math.max(minutes, minMinute) : minutes;
  const canGoPrevMonth =
    !disablePast ||
    viewYear > minDate.getFullYear() ||
    (viewYear === minDate.getFullYear() && viewMonth > minDate.getMonth());
  const days = buildCalendarDays(viewYear, viewMonth, lang);
  const weekdays = weekdayLabels(lang);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const panelContent = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoPrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
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
          const isPast = disablePast && isBeforeDay(day, minDate);
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
              disabled={isPast}
              onClick={() => setDatePart(day.getFullYear(), day.getMonth(), day.getDate())}
              className={`flex h-9 w-full items-center justify-center rounded-full text-sm transition-colors ${
                isPast
                  ? "cursor-not-allowed text-stone-300"
                  : isSelected
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
            value={displayHours}
            onChange={(e) => setTimePart(Number(e.target.value), displayMinutes)}
            className="min-w-0 flex-1 border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors focus:border-ink"
            aria-label={t("pickTime")}
          >
            {Array.from({ length: 24 }, (_, hour) => {
              const disabled = disablePast && isTodaySelected && hour < minHour;
              return (
                <option key={hour} value={hour} disabled={disabled}>
                  {pad(hour)}
                </option>
              );
            })}
          </select>
          <span className="text-stone-400">:</span>
          <select
            value={displayMinutes}
            onChange={(e) => setTimePart(displayHours, Number(e.target.value))}
            className="min-w-0 flex-1 border-b border-stone-300 bg-transparent px-0.5 py-2 text-[15px] outline-none transition-colors focus:border-ink"
            aria-label={t("pickTime")}
          >
            {Array.from({ length: 60 }, (_, minute) => {
              const disabled = disablePast && isTodaySelected && displayHours === minHour && minute < minMinute;
              return (
                <option key={minute} value={minute} disabled={disabled}>
                  {pad(minute)}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    </>
  );

  const renderPortal = (children: ReactNode) => createPortal(children, document.body);

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
        (isMobile
          ? renderPortal(
              <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/50 backdrop-blur-[2px] datepicker-panel-in">
                <button
                  type="button"
                  className="absolute inset-0"
                  aria-label={t("cancel")}
                  onClick={() => setOpen(false)}
                />
                <div
                  ref={panelRef}
                  role="dialog"
                  aria-labelledby={id}
                  className="relative z-[1] max-h-[min(88dvh,100%)] w-full overflow-y-auto overscroll-contain rounded-t-2xl border-t border-stone-200 bg-paper px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(33,29,25,0.12)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="font-display text-xl font-semibold text-ink">
                      {label ?? t("dateTimePlaceholder")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="-me-1 p-2 text-stone-400 transition-colors hover:text-ink"
                      aria-label={t("cancel")}
                    >
                      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                  {panelContent}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-5 w-full rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-clay-700"
                  >
                    {t("save")}
                  </button>
                </div>
              </div>
            )
          : renderPortal(
              <div
                ref={panelRef}
                role="dialog"
                aria-labelledby={id}
                style={panelStyle}
                className="datepicker-panel-in border border-stone-200 bg-paper p-4 shadow-lg shadow-ink/10"
              >
                {panelContent}
              </div>
            ))}
    </div>
  );
}
