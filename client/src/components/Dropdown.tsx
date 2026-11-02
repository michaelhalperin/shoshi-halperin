import { useEffect, useId, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

/** A styled replacement for a native <select>: a trigger button plus a listbox popup. */
export default function Dropdown({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listId = useId();

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    optionRefs.current[selectedIndex]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, selectedIndex]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (next: string) => {
    onChange(next);
    close();
  };

  const move = (from: number, step: number) => {
    const next = (from + step + options.length) % options.length;
    optionRefs.current[next]?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(index, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(index, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      optionRefs.current[options.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-full border bg-white px-4 py-2 text-start text-base transition-colors sm:min-h-10 sm:min-w-56 sm:py-1.5 sm:text-sm ${
          open ? "border-ink" : "border-stone-300 hover:border-stone-400"
        }`}
      >
        <span className="min-w-0 truncate font-medium text-ink">{selected?.label}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute start-0 top-full z-30 mt-2 max-h-72 w-full min-w-56 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-ink/10 sm:w-max sm:max-w-sm"
        >
          {options.map((o, i) => {
            const active = o.value === value;
            return (
              <li key={o.value} role="presentation">
                <button
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => choose(o.value)}
                  onKeyDown={(e) => onListKeyDown(e, i)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start text-base outline-none transition-colors focus-visible:bg-clay-50 hover:bg-clay-50 sm:min-h-9 sm:text-sm ${
                    active ? "font-semibold text-clay-700" : "text-ink"
                  }`}
                >
                  <span className="min-w-0 flex-1">{o.label}</span>
                  {active && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="shrink-0"
                    >
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
