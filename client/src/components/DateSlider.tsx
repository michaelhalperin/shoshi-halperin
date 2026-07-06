import { useRef } from "react";
import { formatDateSlider, type Lang } from "../i18n";

interface DateSliderProps {
  dates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  lang: Lang;
  allLabel: string;
}

export default function DateSlider({
  dates,
  selectedDate,
  onSelectDate,
  lang,
  allLabel,
}: DateSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 160, behavior: "smooth" });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative flex items-center gap-1">
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
          aria-label="Previous dates"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          ref={trackRef}
          className="scrollbar-hide flex flex-1 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth py-1"
        >
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className={`flex w-14 shrink-0 snap-center flex-col items-center justify-center border-b-2 pb-2 transition-colors ${
              !selectedDate ? "border-ink text-ink" : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">{allLabel}</span>
          </button>

          {dates.map((date) => {
            const parts = formatDateSlider(date, lang);
            const active = selectedDate === date;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelectDate(date)}
                className={`flex w-14 shrink-0 snap-center flex-col items-center border-b-2 pb-2 transition-colors ${
                  active ? "border-ink text-ink" : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide">{parts.weekday}</span>
                <span className={`font-display text-2xl leading-none ${active ? "font-semibold" : "font-medium"}`}>
                  {parts.day}
                </span>
                <span className="text-[10px] font-medium">{parts.month}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll(1)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-ink"
          aria-label="Next dates"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
