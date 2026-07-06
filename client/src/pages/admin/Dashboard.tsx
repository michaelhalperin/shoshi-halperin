import { useEffect, useState } from "react";
import { api, type Booking } from "../../api";
import { Card, Spinner } from "../../components/ui";
import { formatDateTime, useI18n } from "../../i18n";

interface Stats {
  courses: number;
  upcoming: number;
  totalBookings: number;
}

export default function Dashboard() {
  const { t, lang, pick } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    api.get<{ stats: Stats }>("/api/admin/stats").then((d) => setStats(d.stats));
    api.get<{ bookings: Booking[] }>("/api/admin/bookings").then((d) => setBookings(d.bookings));
  }, []);

  if (!stats || !bookings) return <Spinner />;

  const cards = [
    { label: t("statCourses"), value: stats.courses },
    { label: t("statUpcoming"), value: stats.upcoming },
    { label: t("statTotal"), value: stats.totalBookings },
  ];

  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && new Date(b.slot.startsAt) >= now)
    .sort((a, b) => +new Date(a.slot.startsAt) - +new Date(b.slot.startsAt))
    .slice(0, 8);

  return (
    <div>
      <div className="mb-10 grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="text-center">
            <div className="font-display text-4xl font-semibold text-clay-700">{c.value}</div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
              {c.label}
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
        {t("statUpcoming")}
      </h2>
      <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
        {upcoming.length === 0 && <p className="px-5 py-6 text-stone-400">—</p>}
        {upcoming.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
            <div>
              <span className="font-semibold text-ink">{b.name}</span>
              <span className="text-stone-300"> · </span>
              <span className="font-light text-stone-600">{pick(b.slot.course, "title")}</span>
            </div>
            <span className="text-sm font-light text-stone-500">
              {formatDateTime(b.slot.startsAt, lang)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
