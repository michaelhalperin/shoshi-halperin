import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError, type Course, type Slot } from "../../api";
import { DateTimePicker, toLocalInputValue } from "../../components/DateTimePicker";
import { Badge, Button, ConfirmModal, ErrorNote, Input, Modal, Select, Spinner } from "../../components/ui";
import { formatDateTime, formatTime, useI18n } from "../../i18n";

export default function AdminSlots() {
  const { t, lang, pick } = useI18n();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<Slot | "new" | null>(null);
  const [form, setForm] = useState({ courseId: "", startsAt: "", endsAt: "" });
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

  const openNew = () => {
    setForm({ courseId: courses?.[0]?.id ?? "", startsAt: "", endsAt: "" });
    setError("");
    setEditing("new");
  };

  const openEdit = (slot: Slot) => {
    setForm({
      courseId: slot.courseId,
      startsAt: toLocalInputValue(slot.startsAt),
      endsAt: toLocalInputValue(slot.endsAt),
    });
    setError("");
    setEditing(slot);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const payload = {
      courseId: form.courseId,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-clay-600">
          {t("manageSlots")}
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              load(e.target.value);
            }}
            className="border-b border-stone-300 bg-transparent px-1 py-2 text-sm outline-none focus:border-ink"
          >
            <option value="">{t("allCourses")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c, "title")}
              </option>
            ))}
          </select>
          <Button onClick={openNew}>+ {t("newSlot")}</Button>
        </div>
      </div>

      {!slots ? (
        <Spinner />
      ) : (
        <div className="divide-y divide-stone-200 border-y border-stone-200 bg-white">
          {slots.map((slot) => (
            <div key={slot.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <div className="font-display text-lg font-semibold text-ink">
                  {slot.course ? pick(slot.course, "title") : ""}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-light text-stone-500">
                  <span>
                    {formatDateTime(slot.startsAt, lang)} – {formatTime(slot.endsAt, lang)}
                  </span>
                  <Badge tone={slot.booked >= slot.capacity ? "red" : "amber"}>
                    {t("bookedCount")}: {slot.booked}/{slot.capacity}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEdit(slot)}>
                  {t("edit")}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    setDeleteError("");
                    setDeleting(slot);
                  }}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
          {slots.length === 0 && <p className="px-5 py-6 font-light text-stone-500">{t("noSlots")}</p>}
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
            <div className="grid gap-5 sm:grid-cols-2">
              <DateTimePicker
                label={t("startTime")}
                required
                value={form.startsAt}
                onChange={(startsAt) => setForm({ ...form, startsAt })}
              />
              <DateTimePicker
                label={t("endTime")}
                required
                value={form.endsAt}
                onChange={(endsAt) => setForm({ ...form, endsAt })}
              />
            </div>
            {error && <ErrorNote message={error} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={busy}>
                {t("save")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
