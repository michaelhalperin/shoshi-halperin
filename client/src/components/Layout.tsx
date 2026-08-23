import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import logo from "../assets/logo.png";
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const menuVisibleRef = useRef(false);
  const location = useLocation();

  useEffect(() => {
    menuVisibleRef.current = menuVisible;
  }, [menuVisible]);

  const finishClose = useCallback(() => {
    setMenuVisible(false);
    setMenuClosing(false);
    closeTimerRef.current = null;
  }, []);

  const closeMenu = useCallback(() => {
    if (!menuVisible || menuClosing) return;
    setMenuClosing(true);
    closeTimerRef.current = window.setTimeout(finishClose, 180);
  }, [menuVisible, menuClosing, finishClose]);

  const openMenu = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuClosing(false);
    setMenuVisible(true);
  }, []);

  const toggleMenu = () => {
    if (menuVisible) closeMenu();
    else openMenu();
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuVisibleRef.current) return;
    setMenuClosing(true);
    closeTimerRef.current = window.setTimeout(finishClose, 180);
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [location.pathname, finishClose]);

  useEffect(() => {
    if (!menuVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuVisible, closeMenu]);

  const navLinkClass = (active: boolean) =>
    `text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors ${
      active ? "text-ink" : "text-clay-600 hover:text-clay-800"
    }`;

  const mobileNavLinkClass = (active: boolean) =>
    `block border-b border-stone-200/80 py-3.5 font-display text-[1.65rem] font-medium leading-none transition-colors ${
      active ? "text-ink" : "text-stone-500 hover:text-ink"
    }`;

  const isCoursesActive =
    location.pathname === "/" || location.pathname.startsWith("/courses/");
  const isRecipesActive =
    location.pathname === "/recipes" || location.pathname.startsWith("/recipes/");
  const isShopActive = location.pathname === "/shop";

  const langButton = (className = "") => (
    <button
      type="button"
      onClick={() => {
        setLang(lang === "en" ? "he" : "en");
        closeMenu();
      }}
      className={`text-[13px] font-semibold uppercase tracking-[0.16em] text-clay-600 transition-colors hover:text-clay-800 ${className}`}
      aria-label={t("switchLang")}
    >
      {t("switchLang")}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 overflow-visible border-b border-stone-200 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            to="/"
            className="flex h-8 shrink-0 items-center transition-opacity hover:opacity-80"
          >
            <img
              src={logo}
              alt={t("appName")}
              className="h-8 w-auto origin-left scale-[1.75] sm:scale-[2]"
            />
          </Link>

          <div className="hidden items-center gap-6 md:flex md:gap-8">
            <nav className="flex items-center gap-5 lg:gap-6" aria-label="Main">
              <Link to="/" className={navLinkClass(isCoursesActive)}>
                {t("courses")}
              </Link>
              <Link to="/recipes" className={navLinkClass(isRecipesActive)}>
                {t("recipes")}
              </Link>
              <Link to="/shop" className={navLinkClass(isShopActive)}>
                {t("shop")}
              </Link>
              <NavLink to="/gallery" className={({ isActive }) => navLinkClass(isActive)}>
                {t("gallery")}
              </NavLink>
              <NavLink to="/testimonials" className={({ isActive }) => navLinkClass(isActive)}>
                {t("testimonials")}
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => navLinkClass(isActive)}>
                {t("about")}
              </NavLink>
            </nav>
            <span className="h-4 w-px bg-stone-200" aria-hidden />
            {langButton()}
          </div>

          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:border-clay-300 hover:bg-clay-50 md:hidden"
            onClick={toggleMenu}
            aria-expanded={menuVisible && !menuClosing}
            aria-controls="mobile-nav"
            aria-label={menuVisible && !menuClosing ? t("closeMenu") : t("openMenu")}
          >
            {menuVisible ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {menuVisible && (
          <nav
            id="mobile-nav"
            className={`absolute inset-x-0 top-full z-40 border-t border-stone-200 bg-paper px-5 pb-6 pt-2 shadow-sm md:hidden ${
              menuClosing ? "mobile-nav-out" : "mobile-nav-in"
            }`}
            aria-label="Main"
          >
            <div className="flex flex-col">
              <Link to="/" className={mobileNavLinkClass(isCoursesActive)}>
                {t("courses")}
              </Link>
              <Link to="/recipes" className={mobileNavLinkClass(isRecipesActive)}>
                {t("recipes")}
              </Link>
              <Link to="/shop" className={mobileNavLinkClass(isShopActive)}>
                {t("shop")}
              </Link>
              <NavLink to="/gallery" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                {t("gallery")}
              </NavLink>
              <NavLink to="/testimonials" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                {t("testimonials")}
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => mobileNavLinkClass(isActive)}>
                {t("about")}
              </NavLink>
            </div>
            <div className="mt-5 pt-1">{langButton()}</div>
          </nav>
        )}
      </header>

      {menuVisible && (
        <button
          type="button"
          className={`fixed inset-0 top-16 z-30 bg-ink/45 md:hidden ${
            menuClosing ? "mobile-nav-backdrop-out" : "mobile-nav-backdrop-in"
          }`}
          aria-label={t("closeMenu")}
          onClick={closeMenu}
        />
      )}

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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-stone-200/80 pt-3">
            <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[11px] text-stone-400">
              <span>
                © {new Date().getFullYear()} {t("appName")}
              </span>
              <span className="text-stone-300" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                {t("createdBy")}
                <a
                  href={siteConfig.credit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-clay-600 underline decoration-clay-300/80 underline-offset-[3px] transition-colors hover:text-clay-800 hover:decoration-clay-500"
                >
                  {siteConfig.credit.name}
                </a>
              </span>
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
