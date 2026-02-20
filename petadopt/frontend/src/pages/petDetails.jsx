import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiPut, apiPatch } from "../lib/api";
import { getSession } from "../lib/session";
import { useTranslation } from "../i18n/LanguageContext";

function statusBadge(status) {
  const base = "rounded-full border px-3 py-1 text-xs font-bold";
  const s = (status ?? "").toUpperCase();
  if (s === "AVAILABLE") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (s === "RESERVED") return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (s === "ADOPTED") return `${base} bg-gray-50 text-gray-700 border-gray-200`;
  return `${base} bg-pink-50 text-pink-700 border-pink-200`;
}

export default function PetDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const session = getSession();
  const role = session?.role;
  const isStaff = role === "adoption_center" || role === "veterinarian";

  const [pet, setPet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  function loadPet() {
    setError("");
    setLoading(true);
    apiGet(`/api/animals/${id}`)
      .then((data) => {
        setPet(data);
        setForm({
          name: data.name ?? "",
          species: data.species ?? "",
          breed: data.breed ?? "",
          gender: data.gender ?? "",
          age: data.age === -1 || data.age === null ? "" : String(data.age),
          shelterId: data.shelterId ?? "",
          adoptionStatus: data.adoptionStatus ?? "AVAILABLE",
          microchipNumber: data.microchipNumber ?? "",
          vaccination: String(data.vaccination ?? ""),
          notes: data.notes ?? "",
        });
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPet();
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiPut(`/api/animals/${id}`, form);
      setNotice(t("edit.success"));
      setEditing(false);
      setTimeout(() => setNotice(""), 2500);
      await loadPet();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(newStatus) {
    if (!confirm(t("status.confirm"))) return;
    setStatusSaving(true);
    setError("");
    setNotice("");
    try {
      await apiPatch(`/api/animals/${id}/status`, { adoptionStatus: newStatus });
      setNotice(t("status.updated"));
      setTimeout(() => setNotice(""), 2500);
      await loadPet();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setStatusSaving(false);
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (loading)
    return (
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
    );

  if (error)
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
        {error}
      </div>
    );

  if (!pet)
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 text-sm text-gray-600 shadow-sm">
        {t("detail.notFound")}
      </div>
    );

  return (
    <div className="space-y-5">
      <Link to="/pets" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
        {t("detail.back")}
      </Link>

      {/* Notice */}
      {notice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      )}
      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              {pet.name ?? t("detail.unnamed")}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {pet.species} • {pet.breed}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={statusBadge(pet.adoptionStatus ?? t("detail.unknown"))}>
              {pet.adoptionStatus ?? t("detail.unknown")}
            </span>
            {isStaff && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
              >
                ✏️ {t("edit.title")}
              </button>
            )}
          </div>
        </div>

        {/* ── Status Workflow Buttons (staff only) ── */}
        {isStaff && !editing && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {(pet.adoptionStatus ?? "").toUpperCase() === "AVAILABLE" && (
              <button
                onClick={() => handleStatusChange("RESERVED")}
                disabled={statusSaving}
                className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {statusSaving ? t("status.updating") : `📋 ${t("status.reserve")}`}
              </button>
            )}
            {(pet.adoptionStatus ?? "").toUpperCase() === "RESERVED" && (
              <>
                <button
                  onClick={() => handleStatusChange("ADOPTED")}
                  disabled={statusSaving}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {statusSaving ? t("status.updating") : `🎉 ${t("status.markAdopted")}`}
                </button>
                <button
                  onClick={() => handleStatusChange("AVAILABLE")}
                  disabled={statusSaving}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  {statusSaving ? t("status.updating") : `↩️ ${t("status.returnAvail")}`}
                </button>
              </>
            )}
            {(pet.adoptionStatus ?? "").toUpperCase() === "ADOPTED" && (
              <button
                onClick={() => handleStatusChange("AVAILABLE")}
                disabled={statusSaving}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {statusSaving ? t("status.updating") : `↩️ ${t("status.returnAvail")}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Form (staff only) ── */}
      {editing && isStaff && (
        <form onSubmit={handleSave} className="rounded-3xl border border-purple-200 bg-purple-50/30 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">{t("edit.title")}</h2>
            <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
              {t("edit.staffOnly")}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <EditField label={t("edit.name")} value={form.name} onChange={(v) => handleChange("name", v)} />
            <EditField label={t("edit.species")} value={form.species} onChange={(v) => handleChange("species", v)} />
            <EditField label={t("edit.breed")} value={form.breed} onChange={(v) => handleChange("breed", v)} />
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t("edit.gender")}</label>
              <select
                value={form.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="male">{t("form.male")}</option>
                <option value="female">{t("form.female")}</option>
              </select>
            </div>
            <EditField label={t("edit.age")} value={form.age} onChange={(v) => handleChange("age", v)} type="number" />
            <EditField label={t("edit.shelter")} value={form.shelterId} onChange={(v) => handleChange("shelterId", v)} />
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t("edit.status")}</label>
              <select
                value={form.adoptionStatus}
                onChange={(e) => handleChange("adoptionStatus", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="AVAILABLE">{t("pets.available")}</option>
                <option value="RESERVED">{t("pets.reserved")}</option>
                <option value="ADOPTED">{t("pets.adopted")}</option>
              </select>
            </div>
            <EditField label={t("edit.microchip")} value={form.microchipNumber} onChange={(v) => handleChange("microchipNumber", v)} />
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{t("edit.vaccinated")}</label>
              <select
                value={form.vaccination}
                onChange={(e) => handleChange("vaccination", e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="true">{t("edit.yes")}</option>
                <option value="false">{t("edit.no")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t("edit.notes")}</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {saving ? t("edit.saving") : t("edit.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-gray-200 px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              {t("edit.cancel")}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-900">{t("detail.overview")}</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <KV k={t("detail.id")} v={pet.animalId} />
            <KV k={t("detail.species")} v={pet.species} />
            <KV k={t("detail.breed")} v={pet.breed} />
            <KV k={t("detail.gender")} v={pet.gender} />
            <KV k={t("detail.age")} v={pet.age === -1 || pet.age === null ? t("detail.unknown") : pet.age} />
            <KV k={t("detail.shelter")} v={pet.shelterId} />
            <KV k={t("detail.docType")} v={pet.docType} />
          </div>
        </div>

        {/* ── Private Data (staff) / Restricted notice (non-staff) ── */}
        {isStaff && pet._hasPrivateData ? (
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/30 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-gray-900">🔒 {t("private.title")}</h2>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                {t("private.badge")}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <KV k={t("private.microchip")} v={pet.microchipNumber ?? t("private.unknown")} />
              <KV
                k={t("private.vaccination")}
                v={
                  pet.vaccination === true ? t("private.yes")
                  : pet.vaccination === false ? t("private.no")
                  : t("private.unknown")
                }
              />
            </div>
            <div className="mt-4">
              <h3 className="text-xs font-bold text-gray-500 mb-1">{t("private.notes")}</h3>
              <p className="rounded-2xl bg-white px-3 py-2 text-sm text-gray-700 border border-indigo-100">
                {pet.notes ?? t("private.noNotes")}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-sm flex items-center justify-center">
            <p className="text-sm text-gray-500 text-center">
              🔒 {t("private.restricted")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
      />
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2">
      <span className="font-semibold text-gray-500">{k}</span>
      <span className="font-semibold text-gray-900">{v ?? "—"}</span>
    </div>
  );
}
