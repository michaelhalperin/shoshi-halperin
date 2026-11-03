import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type Booking } from "../../api";
import Dropdown from "../../components/Dropdown";
import { Badge, Button, ConfirmModal, Spinner } from "../../components/ui";
import { formatSlotDateParts, formatTime, useI18n, type Lang } from "../../i18n";

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function groupBookingsByDay(bookings: Booking[], lang: Lang) {
  const map = new Map<string, Booking[]>();
  for (const booking of bookings) {
    const d = new Date(booking.slot.startsAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = map.get(key);
    if (list) list.push(booking);
    else map.set(key, [booking]);
  }

  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, items]) => ({
      key,
      items: [...items].sort(
        (a, b) =>
          +new Date(a.slot.startsAt) - +new Date(b.slot.startsAt) || a.name.localeCompare(b.name)
      ),
      parts: formatSlotDateParts(items[0].slot.startsAt, lang),
      past: items.every((b) => new Date(b.slot.endsAt).getTime() < Date.now()),
    }));
}

export default function AdminBookings() {
  const { t, lang, pick } = useI18n();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [filter, setFilter] = useState("");
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    api.get<{ bookings: Booking[] }>("/api/admin/bookings").then((d) => setBookings(d.bookings));
  };
  useEffect(load, []);

  const courses = useMemo(() => {
    const map = new Map<string, Booking["slot"]["course"]>();
    for (const b of bookings ?? []) map.set(b.slot.course.id, b.slot.course);
    return [...map.values()].sort((a, b) => pick(a, "title").localeCompare(pick(b, "title")));
  }, [bookings, pick]);

  const days = useMemo(() => {
    const visible = (bookings ?? []).filter((b) => !filter || b.slot.course.id === filter);
    return groupBookingsByDay(visible, lang);
  }, [bookings, filter, lang]);

  const confirmCancel = async () => {
    if (!cancelling) return;
    setCancelBusy(true);
    setCancelError("");
    try {
      await api.post(`/api/bookings/${cancelling.id}/cancel`);
      setCancelling(null);
      load();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setCancelBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.delete(`/api/bookings/${deleting.id}`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  const approve = async (b: Booking) => {
    setApprovingId(b.id);
    try {
      await api.post(`/api/bookings/${b.id}/approve`);
      load();
    } finally {
      setApprovingId(null);
    }
  };

  if (!bookings) return <Spinner />;

  const now = Date.now();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageBookings")}
        </h2>
        <Dropdown
          value={filter}
          onChange={setFilter}
          ariaLabel={t("allCourses")}
          options={[
            { value: "", label: t("allCourses") },
            ...courses.map((c) => ({ value: c.id, label: pick(c, "title") })),
          ]}
        />
      </div>

      {days.length === 0 ? (
        <p className="border-y border-stone-200 bg-white px-4 py-8 text-center font-light text-stone-500 sm:px-5">
          —
        </p>
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <section key={day.key} className="min-w-0">
              <h3 className={`mb-2 px-4 md:px-5 ${day.past ? "text-stone-400" : "text-ink"}`}>
                <time dateTime={day.key} className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold leading-none tabular-nums" dir="ltr">
                    {day.parts.day}
                  </span>
                  <span className={`text-sm font-medium ${day.past ? "text-stone-400" : "text-stone-500"}`}>
                    {day.parts.month}
                    {day.parts.showYear ? ` ${day.parts.year}` : ""}
                    <span className="text-stone-300"> · </span>
                    {day.parts.weekday}
                  </span>
                </time>
              </h3>

              <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
                {day.items.map((b) => {
                  const isPast = new Date(b.slot.endsAt).getTime() < now;
                  const isUpcoming = new Date(b.slot.startsAt).getTime() >= now;
                  const canAct = (b.status === "confirmed" || b.status === "pending") && isUpcoming;
                  return (
                    <article
                      key={b.id}
                      className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h4 className="font-display text-base font-semibold leading-snug text-ink md:text-lg">
                            {b.name}
                          </h4>
                          {b.status === "cancelled" ? (
                            <Badge tone="red">{t("cancelled")}</Badge>
                          ) : b.paymentStatus === "unpaid" ? (
                            <Badge tone="amber">{t("unpaid")}</Badge>
                          ) : b.status === "pending" ? (
                            <Badge tone="amber">{t("pendingApproval")}</Badge>
                          ) : isPast ? (
                            <Badge tone="stone">{t("completed")}</Badge>
                          ) : (
                            <Badge tone="green">{t("confirmed")}</Badge>
                          )}
                          {b.paymentStatus === "paid" && b.status !== "cancelled" ? (
                            <Badge tone="green">{t("paid")}</Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 break-words text-xs text-stone-500">
                          <span dir="ltr">{b.phone}</span>
                          {b.email ? ` · ${b.email}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="font-medium text-clay-700">{pick(b.slot.course, "title")}</span>
                          <span className="text-stone-300" aria-hidden>
                            ·
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-ink">
                            <span className="text-stone-400" aria-hidden>
                              <ClockIcon />
                            </span>
                            <time dateTime={b.slot.startsAt} className="tabular-nums" dir="ltr">
                              {formatTime(b.slot.startsAt, lang)}
                              <span className="text-stone-300"> – </span>
                              {formatTime(b.slot.endsAt, lang)}
                            </time>
                          </span>
                          <span className="text-stone-300" aria-hidden>
                            ·
                          </span>
                          {b.finalPrice != null ? (
                            <span className="text-stone-600">
                              <span className="font-semibold text-ink">₪{b.finalPrice}</span>
                              {b.discountAmount ? (
                                <span className="text-xs text-stone-500">
                                  {" "}
                                  (₪{b.originalPrice} · -₪{b.discountAmount}
                                  {b.couponCode ? ` ${b.couponCode}` : ""})
                                </span>
                              ) : null}
                            </span>
                          ) : b.slot.course.customPrice ? (
                            <span className="text-stone-600">{t("contactForPrice")}</span>
                          ) : (
                            <span className="text-stone-600">₪{b.slot.course.price}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
                        {canAct && b.status === "pending" ? (
                          <Button
                            className="min-h-11 min-w-0 md:min-h-0"
                            disabled={approvingId === b.id}
                            onClick={() => approve(b)}
                          >
                            {t("approve")}
                          </Button>
                        ) : null}
                        {canAct ? (
                          <Button
                            variant="danger"
                            className="min-h-11 min-w-0 md:min-h-0"
                            onClick={() => {
                              setCancelError("");
                              setCancelling(b);
                            }}
                          >
                            {t("cancel")}
                          </Button>
                        ) : null}
                        <Button
                          variant="secondary"
                          className="min-h-11 min-w-0 md:min-h-0"
                          onClick={() => {
                            setDeleteError("");
                            setDeleting(b);
                          }}
                        >
                          {t("delete")}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmModal
          title={t("deleteBooking")}
          message={t("confirmDeleteBooking")}
          confirmLabel={t("delete")}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
          busy={deleteBusy}
          error={deleteError}
        />
      )}

      {cancelling && (
        <ConfirmModal
          title={t("cancel")}
          message={t("confirmCancel")}
          confirmLabel={t("cancelBooking")}
          onClose={() => setCancelling(null)}
          onConfirm={confirmCancel}
          busy={cancelBusy}
          error={cancelError}
        />
      )}
    </div>
  );
}
