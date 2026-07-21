import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, ErrorNote, Input, Spinner } from "../components/ui";
import { useI18n } from "../i18n";

export default function SetPassword() {
  const { t } = useI18n();
  const { user, loading, setPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.mustSetPassword) {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setBusy(true);
    try {
      await setPassword(password, confirmPassword);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;
  if (!user?.mustSetPassword) return null;

  return (
    <div className="mx-auto mt-10 max-w-sm sm:mt-16">
      <h1 className="mb-2 text-center font-display text-4xl font-medium text-ink">
        {t("setPasswordTitle")}
      </h1>
      <div className="mx-auto mb-10 mt-4 h-px w-12 bg-clay-400" />
      <form onSubmit={onSubmit} className="space-y-6">
        <p className="text-sm leading-relaxed text-stone-600">{t("setPasswordHelp")}</p>
        <Input
          label={t("newPassword")}
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPasswordValue(e.target.value)}
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
