import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../lib/api";
import { setSession } from "../lib/session";
import { useTranslation } from "../i18n/LanguageContext";
import LanguageToggle from "../components/languageToggle";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [org, setOrg] = useState("org1");
  const [userId, setUserId] = useState("center1");
  const [error, setError] = useState("");

  // Suggest user IDs based on the selected org
  const suggestedUsers = {
    org1: ["center1", "center2", "admin1"],
    org2: ["vet1", "vet2", "doctor1"],
    org3: ["adopter1", "adopter2", "user1"],
  };

  function handleOrgChange(newOrg) {
    setOrg(newOrg);
    // Auto-update userId to the first suggested user for that org
    setUserId(suggestedUsers[newOrg][0]);
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await apiPost("/api/auth/login", { org, userId });
      setSession(data); // {ok, org, userId, role, mspId} will be stored
      navigate("/");
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-lg">
          {/* Language toggle */}
          <div className="mb-4 flex justify-end">
            <LanguageToggle />
          </div>

          {/* Logo/branding */}
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500" />
            <div className="leading-tight">
              <div className="text-xl font-extrabold tracking-tight text-gray-900">
                {t("login.brand")}
              </div>
              <div className="text-sm text-gray-500">{t("login.subtitle")}</div>
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold text-gray-900">{t("login.title")}</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("login.desc")}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <div className="text-sm font-semibold text-gray-700">{t("login.org")}</div>
              <select
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                value={org}
                onChange={(e) => handleOrgChange(e.target.value)}
              >
                <option value="org1">{t("login.org1")}</option>
                <option value="org2">{t("login.org2")}</option>
                <option value="org3">{t("login.org3")}</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-gray-700">{t("login.userId")}</div>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={`e.g. ${suggestedUsers[org][0]}`}
              />
              <div className="mt-2 text-xs text-gray-500">
                {t("login.suggested")}: {suggestedUsers[org].join(", ")}
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-purple-600 p-3 font-semibold text-white shadow transition hover:bg-purple-700"
            >
              {t("login.submit")}
            </button>
          </form>

          {/* Info section */}
          <div className="mt-6 rounded-xl bg-gray-50 p-4">
            <div className="text-xs font-bold text-gray-700">{t("login.rolePerms")}</div>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li>• <strong>{t("login.perm.center")}</strong> {t("login.perm.centerD")}</li>
              <li>• <strong>{t("login.perm.vet")}</strong> {t("login.perm.vetD")}</li>
              <li>• <strong>{t("login.perm.adopter")}</strong> {t("login.perm.adopterD")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
