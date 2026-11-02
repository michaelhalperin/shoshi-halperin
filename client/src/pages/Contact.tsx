import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api";
import { Button, ErrorNote, Input, Textarea } from "../components/ui";
import { useI18n } from "../i18n";

export default function Contact() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/api/contact", form);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md sm:mt-16">
      <h1 className="mb-2 text-center font-display text-4xl font-medium text-ink">
        {t("contactTitle")}
      </h1>
      <div className="mx-auto mb-10 mt-4 h-px w-12 bg-clay-400" />
      {sent ? (
        <p className="text-center text-sm leading-relaxed text-stone-600">{t("contactSent")}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <p className="text-sm leading-relaxed text-stone-600">{t("contactIntro")}</p>
          <Input label={t("contactName")} required value={form.name} onChange={set("name")} autoComplete="name" />
          <Input label={t("contactEmail")} type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
          <Input label={t("contactPhone")} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
          <Textarea label={t("contactMessage")} required rows={5} value={form.message} onChange={set("message")} />
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={set("website")}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />
          {error && <ErrorNote message={error} />}
          <Button type="submit" disabled={busy} className="w-full py-3">
            {t("contactSend")}
          </Button>
        </form>
      )}
    </div>
  );
}
