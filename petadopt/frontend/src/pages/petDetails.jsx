import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet, apiPut, apiPatch, apiDelete, apiUploadImage } from "../lib/api";
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
  const navigate = useNavigate();
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
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [deleting, setDeleting] = useState(false);
    // Confirmation dialog box customized
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: null,
    nextStatus: null,
  });

  function closeConfirmDialog() {
    setConfirmDialog({
      open: false,
      type: null,
      nextStatus: null,
    });
  }

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
      .catch((e) => setError(e?.message ?? "Failed to load pet details."))
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
      if (editImageFile) {
        await apiUploadImage(id, editImageFile);
      }
      setNotice(t("edit.success"));
      setEditing(false);
      setEditImageFile(null);
      setEditImagePreview(null);
      setTimeout(() => setNotice(""), 2500);
      await loadPet();
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function runStatusChange(newStatus) {
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

  async function runDelete() {
    setDeleting(true);
    setError("");
    try {
      await apiDelete(`/api/animals/${id}`);
      navigate("/pets", { replace: true });
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  }

  // Confirmation dialog 
  function handleStatusChange(newStatus) {
    setConfirmDialog({
      open: true,
      type: "status",
      nextStatus: newStatus,
    });
  }

  function handleDelete() {
    setConfirmDialog({
      open: true,
      type: "delete",
      nextStatus: null,
    });
  }

  async function confirmDialogAction() {
    const { type, nextStatus } = confirmDialog;
    closeConfirmDialog();

    if (type === "status" && nextStatus) {
      await runStatusChange(nextStatus);
    }

    if (type === "delete") {
      await runDelete();
    }
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const statusMap = { AVAILABLE: t("pets.available"), RESERVED: t("pets.reserved"), ADOPTED: t("pets.adopted") };
  const statusLabel = (s) => statusMap[(s ?? "").toUpperCase()] ?? s;

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
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-white p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-gray-900">
              {confirmDialog.type === "delete" ? t("confirm.deleteTitle") : t("confirm.statusTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {confirmDialog.type === "delete" ? t("delete.confirm") : t("status.confirm")}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmDialog}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
              >
                {t("confirm.cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDialogAction}
                className={
                  confirmDialog.type === "delete"
                    ? "rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
                    : "rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
                }
              >
                {confirmDialog.type === "delete" ? t("delete.button") : t("confirm.proceed")}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <div className="rounded-3xl border border-[var(--border)] bg-white overflow-hidden shadow-sm">
        {/* ── Pet Image ── */}
        <div className="w-full overflow-hidden bg-gray-100">
          <img
            src={`/pet_images/${pet.animalId}.jpg`}
            alt={pet.name ?? t("detail.unnamed")}
            className="w-full max-h-[28rem] object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.classList.add("flex", "items-center", "justify-center");
              const span = document.createElement("span");
              span.textContent = "🐾";
              span.className = "text-7xl opacity-30";
              e.currentTarget.parentElement.appendChild(span);
            }}
          />
        </div>

        <div className="p-6">
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
              {statusLabel(pet.adoptionStatus) ?? t("detail.unknown")}
            </span>
            {isStaff && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-purple-200 bg-purple-50 px-4 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                >
                  ✏️ {t("edit.title")}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50 transition"
                >
                  {deleting ? t("delete.deleting") : `🗑️ ${t("delete.button")}`}
                </button>
              </>
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

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">{t("form.image")}</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) {
                  setEditImageFile(f);
                  setEditImagePreview(URL.createObjectURL(f));
                }
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-purple-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
            />
            <p className="mt-1 text-xs text-gray-400">{t("form.imageHint")}</p>
            {editImagePreview && (
              <img src={editImagePreview} alt="Preview" className="mt-2 h-24 w-auto rounded-xl object-cover border border-gray-200" />
            )}
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
