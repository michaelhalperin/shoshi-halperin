import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, ErrorNote, Input } from "../components/ui";
import { useI18n } from "../i18n";

export default function ResetPassword() {
  const { t } = useI18n();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/auth/reset-password", { token, password });
      await refreshUser();
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto mt-10 max-w-sm text-center sm:mt-16">
        <ErrorNote message={t("invalidResetLink")} />
        <Link
          to="/forgot-password"
          className="mt-6 inline-block text-xs font-semibold uppercase tracking-[0.14em] text-clay-600 transition-colors hover:text-clay-800"
        >
          {t("forgotPassword")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-sm sm:mt-16">
      <h1 className="mb-2 text-center font-display text-4xl font-medium text-ink">
        {t("resetPasswordTitle")}
      </h1>
      <div className="mx-auto mb-10 mt-4 h-px w-12 bg-clay-400" />
      <form onSubmit={onSubmit} className="space-y-6">
        <Input
          label={t("newPassword")}
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Input
          label={t("confirmPassword")}
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <ErrorNote message={error} />}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {t("savePassword")}
        </Button>
      </form>
    </div>
  );
}
