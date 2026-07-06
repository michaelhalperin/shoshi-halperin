import { useMemo } from "react";
import type { Slot } from "../api";
import type { Lang } from "../i18n";

function toDateKey(iso: string) {
  const d = new Date(iso);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weekStart(lang: Lang) {
  return lang === "he" ? 0 : 1;
}

function buildCalendarDays(year: number, month: number, start: number) {
  const firstDay = new Date(year, month, 1).getDay();
  let pad = firstDay - start;
  if (pad < 0) pad += 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(pad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export function slotsByDate(slots: Slot[]) {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const key = toDateKey(slot.startsAt);
    const list = map.get(key);
    if (list) list.push(slot);
    else map.set(key, [slot]);
  }
  return map;
}

export { toDateKey };

interface SlotCalendarProps {
  slots: Slot[];
  lang: Lang;
  viewYear: number;
  viewMonth: number;
  selectedDate: string | null;
  onSelectDate: (key: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

export default function SlotCalendar({
  slots,
  lang,
  viewYear,
  viewMonth,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: SlotCalendarProps) {
  const locale = lang === "he" ? "he-IL" : "en-GB";
  const byDate = useMemo(() => slotsByDate(slots), [slots]);
  const days = buildCalendarDays(viewYear, viewMonth, weekStart(lang));

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const weekdayLabels = useMemo(() => {
    const start = weekStart(lang);
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => {
      const day = (start + i) % 7;
      return formatter.format(new Date(2024, 0, 7 + day));
    });
  }, [locale, lang]);

  const todayKey = dateKey(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  return (
    <div className="border border-stone-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-ink"
          aria-label="Previous month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h3 className="font-display text-xl font-medium capitalize text-ink">{monthLabel}</h3>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-ink"
          aria-label="Next month"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400"
          >
            {label}
          </div>
        ))}

        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const key = dateKey(viewYear, viewMonth, day);
          const daySlots = byDate.get(key);
          const hasSlots = !!daySlots?.length;
          const allFull = hasSlots && daySlots.every((s) => s.capacity - s.booked <= 0);
          const isSelected = selectedDate === key;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              disabled={!hasSlots}
              onClick={() => onSelectDate(key)}
              className={`relative flex aspect-square items-center justify-center rounded-full text-sm transition-colors ${
                isSelected
                  ? "bg-ink font-semibold text-paper"
                  : hasSlots
                    ? allFull
                      ? "bg-stone-100 text-stone-400 hover:bg-stone-200"
                      : "bg-clay-50 font-medium text-clay-800 hover:bg-clay-100"
                    : "cursor-default text-stone-300"
              } ${isToday && !isSelected ? "ring-1 ring-clay-400 ring-offset-1" : ""}`}
            >
              {day}
              {hasSlots && !allFull && !isSelected && (
                <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-clay-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
