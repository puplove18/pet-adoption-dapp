import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { getSession } from "../lib/session";
import { useTranslation } from "../i18n/LanguageContext";

import PetCard from "../components/petCard";
import PetForm from "../components/petForm";


export default function Pets() {
  const session = getSession();
  const role = session?.role;
  const { t } = useTranslation();

  // Check if user has staff permissions (adoption center or vet)
  const isStaff = role === "adoption_center" || role === "veterinarian";
  const canAddPets = role === "adoption_center"; // Only adoption centers can register new pets

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");


  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await apiGet("/api/animals");
      setPets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function CreatePet(form) {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await apiPost("/api/animals", form);
      setNotice(t("pets.createSuccess"));
      // disappear after 2.5 seconds
      setTimeout(() => setNotice(""), 2500);
      await load();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const roleDisplay = {
    adoption_center: t("role.staff.full"),
    veterinarian: t("role.vet.full"),
    adopter: t("role.adopter.full"),
  };

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
            {t("pets.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("pets.desc")}
          </p>
        </div>

        {/* Current role display */}
        <div className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <div className="text-xs font-extrabold text-gray-600">{t("pets.yourRole")}</div>
          <div className="mt-2 text-sm font-bold text-gray-900">
            {roleDisplay[role] || role}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {isStaff ? t("pets.staffAccess") : t("pets.publicAccess")}
          </div>
        </div>
      </div>

      {/* Staff-only create form */}
      {canAddPets && (
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-gray-900">{t("pets.createTitle")}</h2>
            <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              {t("pets.staffOnly")}
            </span>
          </div>
          <div className="mt-4">
            <PetForm onSubmit={CreatePet} submitting={submitting} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pets.searchPlaceholder")}
          className="rounded-xl border border-gray-200 px-4 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-4 py-2"
        >
          <option value="">{t("pets.allStatuses")}</option>
          <option value="AVAILABLE">{t("pets.available")}</option>
          <option value="RESERVED">{t("pets.reserved")}</option>
          <option value="ADOPTED">{t("pets.adopted")}</option>
        </select>
      </div>

      {/* Message */}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}



      {loading ? (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="h-40 w-full animate-pulse rounded-2xl bg-gray-200" />
            <div className="mt-4 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-8 w-28 animate-pulse rounded-xl bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pets
          .filter((pet) => {
            const q = search.toLowerCase();
            if (q && !(pet.name ?? "").toLowerCase().includes(q) && !(pet.animalId ?? "").toLowerCase().includes(q)) return false;
            if (statusFilter && (pet.adoptionStatus ?? "").toUpperCase() !== statusFilter) return false;
            return true;
          })
          .map((pet) => (
            <PetCard key={pet.animalId} pet={pet} />
          ))}
      </div>
    )}
    </div>
  );
}
