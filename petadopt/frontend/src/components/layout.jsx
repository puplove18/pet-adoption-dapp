import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../lib/session";
import { useTranslation } from "../i18n/LanguageContext";
import LanguageToggle from "./languageToggle";
import { PawPrint } from "lucide-react";

export default function Layout() {
  const navigate = useNavigate();
  const session = getSession();
  const { t } = useTranslation();

  const navClass = ({ isActive }) =>
    [
      "px-3 py-2 rounded-xl text-sm font-semibold transition",
      isActive
        ? "bg-white/70 text-gray-900 shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-white/50",
    ].join(" ");

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  const roleDisplay = {
    adoption_center: t("role.adoption_center"),
    veterinarian: t("role.veterinarian"),
    adopter: t("role.adopter"),
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-purple-500">
              <PawPrint size={28} className="text-white drop-shadow"/>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-gray-900">
                {t("nav.brand")}
              </div>
              <div className="text-xs text-gray-500">{t("nav.subtitle")}</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <NavLink to="/" end className={navClass}>
              {t("nav.home")}
            </NavLink>
            <NavLink to="/pets" end className={navClass}>
              {t("nav.pets")}
            </NavLink>
            {session?.role === "adoption_center" && (
              <NavLink to="/pets/register" className={navClass}>
                {t("nav.registerPet")}
              </NavLink>
            )}

            {/* User info and logout */}
            <div className="ml-4 flex items-center gap-3 border-l border-gray-200 pl-4">
              <div className="text-right">
                <div className="text-xs font-semibold text-gray-900">
                  {session?.userId}
                </div>
                <div className="text-xs text-gray-500">
                  {roleDisplay[session?.role] || session?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                {t("nav.logout")}
              </button>
              <LanguageToggle />
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
