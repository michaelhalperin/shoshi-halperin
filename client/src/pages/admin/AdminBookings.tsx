import { useEffect, useState } from "react";
import { api, ApiError, type Booking } from "../../api";
import { Badge, Button, ConfirmModal, Spinner } from "../../components/ui";
import { formatDateTime, useI18n } from "../../i18n";

export default function AdminBookings() {
  const { t, lang, pick } = useI18n();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const load = () => {
    api.get<{ bookings: Booking[] }>("/api/admin/bookings").then((d) => setBookings(d.bookings));
  };
  useEffect(load, []);

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

  if (!bookings) return <Spinner />;

  const now = Date.now();

  return (
    <div>
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
        {t("manageBookings")}
      </h2>
      <div className="overflow-x-auto border-y border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-start text-[11px] uppercase tracking-[0.14em] text-stone-400">
              <th className="px-4 py-3 text-start font-semibold">{t("student")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("course")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("when")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("price")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => {
              const isPast = new Date(b.slot.endsAt).getTime() < now;
              const isUpcoming = new Date(b.slot.startsAt).getTime() >= now;
              return (
                <tr key={b.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{b.name}</div>
                    <div className="text-xs text-stone-500">
                      {b.phone}
                      {b.email ? ` · ${b.email}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{pick(b.slot.course, "title")}</td>
                  <td className="px-4 py-3 text-stone-600">{formatDateTime(b.slot.startsAt, lang)}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {b.finalPrice != null ? (
                      <div>
                        <div className="font-semibold text-ink">₪{b.finalPrice}</div>
                        {b.discountAmount ? (
                          <div className="text-xs text-stone-500">
                            ₪{b.originalPrice} · -₪{b.discountAmount}
                            {b.couponCode ? ` (${b.couponCode})` : ""}
                          </div>
                        ) : null}
                      </div>
                    ) : b.slot.course.customPrice ? (
                      <span>{t("contactForPrice")}</span>
                    ) : (
                      <span>₪{b.slot.course.price}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.status === "cancelled" ? (
                      <Badge tone="red">{t("cancelled")}</Badge>
                    ) : isPast ? (
                      <Badge tone="stone">{t("completed")}</Badge>
                    ) : (
                      <Badge tone="green">{t("confirmed")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    {b.status === "confirmed" && isUpcoming && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          setCancelError("");
                          setCancelling(b);
                        }}
                      >
                        {t("cancel")}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                  —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
