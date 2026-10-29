import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError, type Course, type Slot } from "../../api";
import { DateTimePicker, toLocalInputValue } from "../../components/DateTimePicker";
import { Button, ConfirmModal, ErrorNote, Modal, ModalActions, Select, Spinner } from "../../components/ui";
import { formatDateTime, formatSlotDateParts, formatTime, useI18n, type Lang } from "../../i18n";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function addHoursToLocalValue(value: string, hours: number) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  d.setHours(d.getHours() + hours);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function isFourHourDuration(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end - start === FOUR_HOURS_MS;
}

function formatSlotEndPreview(startsAt: string, endsAt: string, lang: Lang) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  return sameDay ? formatTime(end.toISOString(), lang) : formatDateTime(end.toISOString(), lang);
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function groupSlotsByDay(slots: Slot[], lang: Lang) {
  const map = new Map<string, Slot[]>();
  for (const slot of slots) {
    const d = new Date(slot.startsAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const list = map.get(key);
    if (list) list.push(slot);
    else map.set(key, [slot]);
  }

  return [...map.entries()].map(([key, items]) => ({
    key,
    items: [...items].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    parts: formatSlotDateParts(items[0].startsAt, lang),
    past: items.every((s) => new Date(s.endsAt).getTime() < Date.now()),
  }));
}

export default function AdminSlots() {
  const { t, lang, pick } = useI18n();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Slot | "new" | null>(null);
  const [form, setForm] = useState({ courseId: "", startsAt: "", endsAt: "" });
  const [fourHours, setFourHours] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<Slot | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = (courseId: string) => {
    setSlots(null);
    api
      .get<{ slots: Slot[] }>(`/api/admin/slots${courseId ? `?courseId=${courseId}` : ""}`)
      .then((d) => setSlots(d.slots));
  };

  useEffect(() => {
    api.get<{ courses: Course[] }>("/api/courses?all=1").then((d) => setCourses(d.courses));
    load("");
  }, []);

  const days = useMemo(() => (slots ? groupSlotsByDay(slots, lang) : []), [slots, lang]);

  const openNew = () => {
    setForm({ courseId: courses?.[0]?.id ?? "", startsAt: "", endsAt: "" });
    setFourHours(true);
    setError("");
    setEditing("new");
  };

  const openEdit = (slot: Slot) => {
    setForm({
      courseId: slot.courseId,
      startsAt: toLocalInputValue(slot.startsAt),
      endsAt: toLocalInputValue(slot.endsAt),
    });
    setFourHours(isFourHourDuration(slot.startsAt, slot.endsAt));
    setError("");
    setEditing(slot);
  };

  const setStartTime = (startsAt: string) => {
    setForm({
      ...form,
      startsAt,
      endsAt: fourHours ? addHoursToLocalValue(startsAt, 4) : form.endsAt,
    });
  };

  const setFourHourCourse = (checked: boolean) => {
    setFourHours(checked);
    if (checked) {
      setForm({ ...form, endsAt: addHoursToLocalValue(form.startsAt, 4) });
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const endsAt = fourHours ? addHoursToLocalValue(form.startsAt, 4) : form.endsAt;
    const payload = {
      courseId: form.courseId,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    };
    try {
      if (editing === "new") {
        await api.post("/api/slots", payload);
      } else if (editing) {
        await api.put(`/api/slots/${editing.id}`, payload);
      }
      setEditing(null);
      load(filter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.delete(`/api/slots/${deleting.id}`);
      setDeleting(null);
      load(filter);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!courses) return <Spinner />;

  const selectedCourse = courses.find((c) => c.id === form.courseId);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageSlots")}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <select
            value={filter}
            aria-label={t("allCourses")}
            onChange={(e) => {
              setFilter(e.target.value);
              load(e.target.value);
            }}
            className="min-h-11 w-full border-b border-stone-300 bg-transparent px-1 py-2 text-base outline-none focus:border-ink sm:min-h-0 sm:w-auto sm:text-sm"
          >
            <option value="">{t("allCourses")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c, "title")}
              </option>
            ))}
          </select>
          <Button className="min-h-11 w-full sm:min-h-0 sm:w-auto" onClick={openNew}>
            + {t("newSlot")}
          </Button>
        </div>
      </div>

      {!slots ? (
        <Spinner />
      ) : days.length === 0 ? (
        <p className="border-y border-stone-200 bg-white px-4 py-8 text-center font-light text-stone-500 sm:px-5">
          {t("noSlots")}
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
                {day.items.map((slot) => {
                  const full = slot.booked >= slot.capacity;
                  return (
                    <article
                      key={slot.id}
                      className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display text-base font-semibold leading-snug text-pretty text-ink md:text-lg">
                          {slot.course ? pick(slot.course, "title") : ""}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">
                            <span className="text-stone-400" aria-hidden>
                              <ClockIcon />
                            </span>
                            <time dateTime={slot.startsAt} className="tabular-nums" dir="ltr">
                              {formatTime(slot.startsAt, lang)}
                              <span className="text-stone-300"> – </span>
                              {formatTime(slot.endsAt, lang)}
                            </time>
                          </span>
                          <span className="text-stone-300" aria-hidden>
                            ·
                          </span>
                          <span
                            className={`shrink-0 text-sm tabular-nums ${full ? "font-semibold text-red-700" : "text-clay-700"}`}
                          >
                            {t("bookedCount")}:{" "}
                            <span dir="ltr">
                              {slot.booked}/{slot.capacity}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
                        <Button
                          variant="secondary"
                          className="min-h-11 min-w-0 md:min-h-0"
                          onClick={() => openEdit(slot)}
                        >
                          {t("edit")}
                        </Button>
                        <Button
                          variant="danger"
                          className="min-h-11 min-w-0 md:min-h-0"
                          onClick={() => {
                            setDeleteError("");
                            setDeleting(slot);
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
          title={t("delete")}
          message={t("confirmDelete")}
          onClose={() => setDeleting(null)}
          onConfirm={confirmRemove}
          busy={deleteBusy}
          error={deleteError}
        />
      )}

      {editing && (
        <Modal title={editing === "new" ? t("newSlot") : t("edit")} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-5">
            <Select
              label={t("course")}
              required
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              disabled={editing !== "new"}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c, "title")}
                </option>
              ))}
            </Select>
            {selectedCourse && (
              <p className="text-sm font-light text-stone-500">
                {t("slotCapacityNote")} ({t("maxParticipants")}: {selectedCourse.maxParticipants})
              </p>
            )}
            <DateTimePicker
              label={t("startTime")}
              required
              value={form.startsAt}
              onChange={setStartTime}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-medium text-stone-600">
              <input
                type="checkbox"
                checked={fourHours}
                onChange={(e) => setFourHourCourse(e.target.checked)}
                className="h-4 w-4 accent-clay-600"
              />
              <span>
                {t("fourHourCourse")}
                {fourHours && form.startsAt && form.endsAt && (
                  <span className="font-normal text-stone-400">
                    {" · "}
                    {formatSlotEndPreview(form.startsAt, form.endsAt, lang)}
                  </span>
                )}
              </span>
            </label>
            {!fourHours && (
              <DateTimePicker
                label={t("endTime")}
                required
                value={form.endsAt}
                onChange={(endsAt) => setForm({ ...form, endsAt })}
              />
            )}
            {error && <ErrorNote message={error} />}
            <ModalActions>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)} className="w-full sm:w-auto">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                {t("save")}
              </Button>
            </ModalActions>
          </form>
        </Modal>
      )}
    </div>
  );
}
