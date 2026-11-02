import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
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

  if (sent) {
    return (
      <div className="mx-auto mt-14 max-w-md text-center sm:mt-24">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-clay-200 bg-clay-50 text-clay-600">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display text-4xl font-medium text-ink sm:text-5xl">
          {t("contactThanksTitle")}, {form.name.trim().split(" ")[0]}
        </h1>
        <div className="mx-auto my-6 h-px w-12 bg-clay-400" />
        <p className="mx-auto max-w-sm text-base leading-relaxed text-stone-600">
          {t("contactThanksBody")}
        </p>
        <Link
          to="/"
          className="mt-10 inline-block rounded-full bg-ink px-7 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-paper transition-colors hover:bg-clay-700"
        >
          {t("contactThanksCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-md sm:mt-16">
      <h1 className="mb-2 text-center font-display text-4xl font-medium text-ink">
        {t("contactTitle")}
      </h1>
      <div className="mx-auto mb-10 mt-4 h-px w-12 bg-clay-400" />
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
    </div>
  );
}
