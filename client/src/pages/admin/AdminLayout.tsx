import { NavLink, Outlet } from "react-router-dom";
import { useI18n } from "../../i18n";

export default function AdminLayout() {
  const { t } = useI18n();

  const tabs = [
    { to: "/admin", label: t("dashboard"), end: true },
    { to: "/admin/courses", label: t("manageCourses") },
    { to: "/admin/recipes", label: t("manageRecipes") },
    { to: "/admin/gallery", label: t("manageGallery") },
    { to: "/admin/about", label: t("manageAbout") },
    { to: "/admin/slots", label: t("manageSlots") },
    { to: "/admin/bookings", label: t("manageBookings") },
    { to: "/admin/coupons", label: t("manageCoupons") },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-4xl font-medium text-ink">{t("admin")}</h1>
      <nav className="scrollbar-hide -mx-5 mb-8 flex flex-nowrap gap-x-6 overflow-x-auto overflow-y-hidden border-b border-stone-200 px-5 sm:-mx-8 sm:px-8">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `-mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-3 text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                isActive
                  ? "border-clay-500 text-ink"
                  : "border-transparent text-stone-400 hover:text-ink"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
