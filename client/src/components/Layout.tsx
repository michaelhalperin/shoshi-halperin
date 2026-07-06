import { type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { siteConfig } from "../site";

const socialItems = [
  {
    key: "instagram" as const,
    label: "Instagram",
    href: siteConfig.social.instagram,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    href: siteConfig.social.facebook,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M14 8.5V7.2c0-.7.5-1.2 1.2-1.2H17V3h-2.4C12.8 3 11 4.8 11 7.2V8.5H9v3h2V21h3v-9.5h2.6l.4-3H14z" />
      </svg>
    ),
  },
  {
    key: "whatsapp" as const,
    label: "WhatsApp",
    href: siteConfig.social.whatsapp,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.5 2 2 6.1 2 11.2c0 1.8.5 3.5 1.4 5L2 22l6-1.3c1.4.8 3 1.2 4.6 1.2 5.5 0 10-4.1 10-9.2S17.5 2 12 2zm5.8 13.5c-.2.7-1.2 1.3-1.9 1.4-.5.1-1.1.2-3.6-.8-3-1.2-5-4.2-5.1-4.4-.2-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1.1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6-.1.2-.2.3-.3.4l-.4.4c-.1.1-.2.3-.1.5.3.7 1.2 2.3 2.9 3.3 1.8 1.1 1.8.7 2.1.7.3 0 .9-.4 1-.7.1-.3.1-.7.1-.7s0-.1.5-.3c.5-.2.9-.2 1-.2.1 0 .3 0 .5.4.2.4.7 1.7.8 2.1z" />
      </svg>
    ),
  },
].filter((item) => item.href.length > 0);

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition-colors hover:border-clay-300 hover:bg-clay-50 hover:text-clay-700"
    >
      {children}
    </a>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const isAdmin = user?.role === "admin";

  const langButton = (
    <button
      onClick={() => setLang(lang === "en" ? "he" : "en")}
      className="text-[13px] font-semibold uppercase tracking-[0.16em] text-clay-600 transition-colors hover:text-clay-800"
      aria-label={t("switchLang")}
    >
      {t("switchLang")}
    </button>
  );

  const navLinkClass = (active: boolean) =>
    `text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors ${
      active ? "text-ink" : "text-clay-600 hover:text-clay-800"
    }`;

  const location = useLocation();
  const isCoursesActive =
    location.pathname === "/" || location.pathname.startsWith("/courses/");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link
            to="/"
            className="font-display text-2xl font-semibold tracking-wide text-ink transition-colors hover:text-clay-800"
          >
            {t("appName")}
          </Link>

          <div className="flex items-center gap-6 sm:gap-8">
            <nav className="flex items-center gap-5 sm:gap-6" aria-label="Main">
              <Link to="/" className={navLinkClass(isCoursesActive)}>
                {t("courses")}
              </Link>
              <NavLink to="/about" className={({ isActive }) => navLinkClass(isActive)}>
                {t("about")}
              </NavLink>
            </nav>
            <span className="hidden h-4 w-px bg-stone-200 sm:block" aria-hidden />
            {langButton}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">
        <Outlet />
      </main>

      <footer className="mt-auto border-t border-stone-200 bg-clay-50/60">
        <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-center sm:text-start">
              <Link to="/" className="font-display text-lg font-semibold text-ink transition-colors hover:text-clay-800">
                {t("appName")}
              </Link>
              <p className="mt-0.5 text-xs text-stone-500">{t("footer")}</p>
            </div>

            {socialItems.length > 0 && (
              <div className="flex items-center gap-1.5">
                {socialItems.map((item) => (
                  <SocialLink key={item.key} href={item.href} label={item.label}>
                    {item.icon}
                  </SocialLink>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-stone-200/80 pt-3">
            <p className="text-[11px] text-stone-400">
              © {new Date().getFullYear()} {t("appName")}
              <span className="mx-1.5 text-stone-300" aria-hidden>
                ·
              </span>
              made with ❤️ by{" "}
              <a
                href={siteConfig.credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-500 transition-colors hover:text-clay-700"
              >
                {siteConfig.credit.name}
              </a>
            </p>
            <Link
              to={isAdmin ? "/admin" : "/login"}
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-300 transition-colors hover:text-stone-500"
            >
              {t("admin")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
