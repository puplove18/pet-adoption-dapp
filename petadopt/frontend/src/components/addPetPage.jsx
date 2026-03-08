// it should not register the same animalID, and if possible look for the same MC number on registrationa dn editing the pet info
// MC editing should also block maybe

import { Link } from "react-router-dom";
import { useState } from "react";
import PetForm from "./petForm";
import { apiPost, apiUploadImage } from "../lib/api";
import { getSession } from "../lib/session";
import { useTranslation } from "../i18n/LanguageContext";


export default function AddPetPage() {
  const { t } = useTranslation();
  const role = getSession()?.role;
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formVersion, setFormVersion] = useState(0);

  function getRegisterErrorMessage(rawMessage) {
    const normalized = String(rawMessage ?? "").toLowerCase();

    if (normalized.includes("animal id") && normalized.includes("already exists")) {
      return `${t("addPet.fail")}${t("register.duplicateId")}`;
    }

    if (normalized.includes("microchip") && normalized.includes("already assigned")) {
      return `${t("addPet.fail")}${t("register.duplicateMicrochip")}`;
    }

    if (normalized.includes("microchip number must be exactly 15 digits")) {
      return `${t("addPet.fail")}${t("register.invalidMicrochip")}`;
    }

    return `${t("addPet.fail")}${rawMessage}`;
  }

  if (role !== "adoption_center") {
    return (
      <div className="space-y-5">
        <Link to="/pets" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
          {t("register.back")}
        </Link>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-red-900">{t("register.deniedTitle")}</h1>
          <p className="mt-2 text-sm text-red-800">{t("register.deniedBody")}</p>
        </div>
      </div>
    );
  }

  async function handleCreatePet(form, imageFile) {
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      await apiPost("/api/animals", form);
      // Upload image if provided (off-chain, optional)
      if (imageFile) {
        await apiUploadImage(form.animalId, imageFile);
      }
      setMessage(t("register.success"));
      setFormVersion((current) => current + 1);
    } catch (err) {
      setError(getRegisterErrorMessage(err?.message ?? String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/pets" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
        {t("register.back")}
      </Link>

      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              {t("register.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {t("register.desc")}
            </p>
          </div>
          <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
            {t("register.staffOnly")}
          </span>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <PetForm
        key={formVersion}
        onSubmit={handleCreatePet}
        submitting={submitting}
      />
    </div>
  );
}
