import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError, type Course, type Slot } from "../api";
import SlotCalendar, { toDateKey } from "../components/SlotCalendar";
import { Button, CourseImage, ErrorNote, Input, Modal, OrnamentalDivider, Spinner } from "../components/ui";
import { formatDateTime, formatTime, useI18n } from "../i18n";

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang, pick } = useI18n();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [success, setSuccess] = useState("");

  // Guest booking form state
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const loadSlots = useCallback(() => {
    api.get<{ slots: Slot[] }>(`/api/slots?courseId=${id}`).then((d) => setSlots(d.slots));
  }, [id]);

  useEffect(() => {
    api
      .get<{ course: Course }>(`/api/courses/${id}`)
      .then((d) => setCourse(d.course))
      .catch(() => navigate("/"));
    loadSlots();
  }, [id, loadSlots, navigate]);

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
    setFormError("");
    setSuccess("");
    setBookingSlot(slot);
  };

  const submitBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingSlot) return;
    setFormError("");
    setBusy(true);
    try {
      await api.post("/api/bookings", { slotId: bookingSlot.id, ...form });
      setBookingSlot(null);
      setSuccess(t("bookedSuccess"));
      loadSlots();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  if (!course) return <Spinner />;

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
            {course.durationMin} {t("minutes")} · ₪{course.price} · {t("upToPeople")}{" "}
            {course.maxParticipants} {t("people")}
          </p>
          <h1 className="mb-5 font-display text-4xl font-medium leading-[1.1] text-ink sm:text-5xl">
            {pick(course, "title")}
          </h1>
          <p className="text-[17px] font-light leading-relaxed text-stone-600">
            {pick(course, "description")}
          </p>
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
              label={t("emailOptional")}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
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
