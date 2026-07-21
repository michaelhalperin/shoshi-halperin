import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { Button, ErrorNote, Input } from "../components/ui";
import { useI18n } from "../i18n";

export default function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm sm:mt-16">
      <h1 className="mb-2 text-center font-display text-4xl font-medium text-ink">
        {t("forgotPasswordTitle")}
      </h1>
      <div className="mx-auto mb-10 mt-4 h-px w-12 bg-clay-400" />
      {sent ? (
        <div className="space-y-6 text-center">
          <p className="text-sm leading-relaxed text-stone-600">{t("forgotPasswordSent")}</p>
          <Link
            to="/login"
            className="inline-block text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 transition-colors hover:text-clay-800"
          >
            {t("backToLogin")}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <p className="text-sm leading-relaxed text-stone-600">{t("forgotPasswordHelp")}</p>
          <Input
            label={t("email")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && <ErrorNote message={error} />}
          <Button type="submit" disabled={busy} className="w-full py-3">
            {t("sendResetLink")}
          </Button>
          <p className="text-center">
            <Link
              to="/login"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400 transition-colors hover:text-clay-700"
            >
              {t("backToLogin")}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
