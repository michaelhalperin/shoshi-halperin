import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { Button, ErrorNote, Input } from "../components/ui";
import { useI18n } from "../i18n";

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.mustSetPassword ? "/set-password" : "/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("errorGeneric"));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-sm sm:mt-16">
      <h1 className="mb-2 text-center font-display text-4xl font-medium text-ink">
        {t("loginTitle")}
      </h1>
      <div className="mx-auto mb-10 mt-4 h-px w-12 bg-clay-400" />
      <form onSubmit={onSubmit} className="space-y-6">
        <Input
          label={t("email")}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Input
          label={t("password")}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && <ErrorNote message={error} />}
        <Button type="submit" disabled={busy} className="w-full py-3">
          {t("login")}
        </Button>
        <p className="text-center">
          <Link
            to="/forgot-password"
            className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400 transition-colors hover:text-clay-700"
          >
            {t("forgotPassword")}
          </Link>
        </p>
      </form>
    </div>
  );
}
