import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError, type CouponValidation, type Course, type Slot } from "../api";
import SlotCalendar, { toDateKey } from "../components/SlotCalendar";
import { Button, CourseImage, ErrorNote, Input, Modal, OrnamentalDivider, Spinner } from "../components/ui";
import { formatDateTime, formatTime, useI18n } from "../i18n";
import { siteConfig } from "../site";
import NotFound from "./NotFound";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, pick } = useI18n();

  const [course, setCourse] = useState<Course | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState("");

  // Guest booking form state
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const loadSlots = useCallback(() => {
    api.get<{ slots: Slot[] }>(`/api/slots?courseId=${id}`).then((d) => setSlots(d.slots));
  }, [id]);

  useEffect(() => {
    setCourse(null);
    setSlots(null);
    setNotFound(false);
    api
      .get<{ course: Course }>(`/api/courses/${id}`)
      .then((d) => {
        setCourse(d.course);
        loadSlots();
      })
      .catch(() => setNotFound(true));
  }, [id, loadSlots]);

  useEffect(() => {
    if (!slots?.length) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate((current) => {
      if (current && slots.some((s) => toDateKey(s.startsAt) === current)) return current;
      const first = new Date(slots[0].startsAt);
      setViewYear(first.getFullYear());
      setViewMonth(first.getMonth());
      return toDateKey(slots[0].startsAt);
    });
  }, [slots]);

  const visibleSlots = useMemo(() => {
    if (!slots) return null;
    if (!selectedDate) return slots;
    return slots.filter((slot) => toDateKey(slot.startsAt) === selectedDate);
  }, [slots, selectedDate]);

  const openBooking = (slot: Slot) => {
    setForm({ name: "", phone: "", email: "" });
    setCouponCode("");
    setCouponResult(null);
    setCouponError("");
    setFormError("");
    setSuccess("");
    setBookingSlot(slot);
  };

  const applyCoupon = async () => {
    if (!course || !couponCode.trim()) return;
    setCouponError("");
    setCouponBusy(true);
    try {
      const result = await api.post<CouponValidation>("/api/coupons/validate", {
        code: couponCode.trim(),
        courseId: course.id,
      });
      setCouponResult(result);
      setCouponCode(result.code);
    } catch (err) {
      setCouponResult(null);
      setCouponError(err instanceof ApiError ? err.message : t("couponInvalid"));
    } finally {
      setCouponBusy(false);
    }
  };

  const submitBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingSlot) return;
    setFormError("");
    setBusy(true);
    try {
      await api.post("/api/bookings", {
        slotId: bookingSlot.id,
        ...form,
        lang,
        couponCode: course?.customPrice
          ? undefined
          : (couponResult?.code ?? (couponCode.trim() || undefined)),
      });
      setBookingSlot(null);
      setSuccess(t("bookedSuccess"));
      loadSlots();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  if (notFound) return <NotFound />;
  if (!course) return <Spinner />;

  const priceLabel = course.customPrice ? t("contactForPrice") : `₪${course.price}`;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Course header: image beside editorial text */}
      <section className="mb-16 grid items-center gap-8 py-6 md:grid-cols-2 md:gap-14">
        <CourseImage
          imageUrl={course.imageUrl}
          color={course.color}
          alt={pick(course, "title")}
          className="group aspect-[4/3] md:aspect-[4/5]"
        />
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-clay-600">
            {course.durationMin} {t("minutes")} · {priceLabel} · {t("upToPeople")}{" "}
            {course.maxParticipants} {t("people")}
          </p>
          <h1 className="mb-5 font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
            {pick(course, "title")}
          </h1>
          <p className="text-[17px] font-light leading-relaxed text-stone-600">
            {pick(course, "description")}
          </p>
          {course.customPrice && (
            <a
              href={siteConfig.social.whatsappCustomPrice}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex text-sm font-semibold uppercase tracking-[0.14em] text-clay-700 underline decoration-clay-300 underline-offset-4 transition-colors hover:text-clay-800"
            >
              {t("contactViaWhatsApp")}
            </a>
          )}
        </div>
      </section>

      {/* Slots */}
      <section className="pb-10">
        <h2 className="mb-2 text-center font-display text-3xl font-medium text-ink">
          {t("availableTimes")}
        </h2>
        <OrnamentalDivider className="mb-8 mt-4" />

        {success && (
          <p className="mx-auto mb-6 max-w-lg border-s-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </p>
        )}

        {!slots ? (
          <Spinner />
        ) : slots.length === 0 ? (
          <p className="text-center font-light text-stone-500">{t("noSlots")}</p>
        ) : (
          <div className="grid items-start gap-8 md:grid-cols-[minmax(260px,300px)_1fr] md:gap-10">
            <SlotCalendar
              slots={slots}
              lang={lang}
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onMonthChange={(year, month) => {
                setViewYear(year);
                setViewMonth(month);
              }}
            />

            <div>
              {selectedDate && (
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-clay-600">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                    lang === "he" ? "he-IL" : "en-GB",
                    { weekday: "long", day: "numeric", month: "long" }
                  )}
                </p>
              )}

              {!visibleSlots?.length ? (
                <p className="font-light text-stone-500">{t("noSlotsOnDay")}</p>
              ) : (
                <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
                  {visibleSlots.map((slot) => {
                    const left = slot.capacity - slot.booked;
                    const isFull = left <= 0;
                    return (
                      <div
                        key={slot.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                      >
                        <div>
                          <div className="font-semibold text-ink">
                            {formatDateTime(slot.startsAt, lang)}
                          </div>
                          <div className="mt-0.5 text-sm font-light text-stone-500">
                            {formatTime(slot.startsAt, lang)}–{formatTime(slot.endsAt, lang)}
                            <span className="mx-2 text-stone-300">·</span>
                            {isFull ? (
                              <span className="font-semibold uppercase tracking-wide text-red-600">
                                {t("full")}
                              </span>
                            ) : (
                              <span className="text-clay-700">
                                {left} {t("spotsLeft")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button disabled={isFull} onClick={() => openBooking(slot)}>
                          {t("book")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Guest booking form */}
      {bookingSlot && (
        <Modal title={t("bookingFormTitle")} onClose={() => setBookingSlot(null)}>
          <p className="mb-1 font-display text-lg font-semibold text-ink">
            {pick(course, "title")}
          </p>
          <p className="mb-6 text-sm font-light text-stone-500">
            {formatDateTime(bookingSlot.startsAt, lang)} ·{" "}
            {formatTime(bookingSlot.startsAt, lang)}–{formatTime(bookingSlot.endsAt, lang)}
          </p>
          <p className="mb-6 text-sm font-light text-stone-500">{t("bookingFormHint")}</p>

          <div className="mb-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
            {course.customPrice ? (
              <div className="space-y-2">
                <div className="flex justify-between font-semibold text-ink">
                  <span>{t("price")}</span>
                  <span>{t("contactForPrice")}</span>
                </div>
                <a
                  href={siteConfig.social.whatsappCustomPrice}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 transition-colors hover:text-clay-800"
                >
                  {t("contactViaWhatsApp")}
                </a>
              </div>
            ) : couponResult ? (
              <div className="space-y-1">
                <div className="flex justify-between text-stone-600">
                  <span>{t("originalPrice")}</span>
                  <span>₪{couponResult.originalPrice}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>
                    {t("discount")} ({couponResult.code})
                  </span>
                  <span>-₪{couponResult.discountAmount}</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold text-ink">
                  <span>{t("finalPrice")}</span>
                  <span>₪{couponResult.finalPrice}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between font-semibold text-ink">
                <span>{t("price")}</span>
                <span>₪{course.price}</span>
              </div>
            )}
          </div>

          <form onSubmit={submitBooking} className="space-y-5">
            <Input
              label={t("name")}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="name"
            />
            <Input
              label={t("phone")}
              type="tel"
              required
              minLength={5}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              autoComplete="tel"
            />
            <Input
              label={t("email")}
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
            {!course.customPrice && (
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  {t("couponCodeOptional")}
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponResult(null);
                      setCouponError("");
                    }}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm uppercase tracking-wide text-ink outline-none transition-colors focus:border-clay-500"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={couponBusy || !couponCode.trim()}
                    onClick={applyCoupon}
                  >
                    {t("applyCoupon")}
                  </Button>
                </div>
                {couponResult && (
                  <p className="mt-2 text-sm text-emerald-700">{t("couponApplied")}</p>
                )}
                {couponError && <p className="mt-2 text-sm text-red-600">{couponError}</p>}
              </div>
            )}
            {formError && <ErrorNote message={formError} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setBookingSlot(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("bookNow")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
