import { useState } from "react";
import { useTranslation } from "../i18n/LanguageContext";


export default function PetForm({ onSubmit, submitting }) {
  const { t } = useTranslation();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({
    animalId: "",
    name: "",
    species: "dog",
    breed: "",
    gender: "",
    age: "",
    shelterId: "",
    microchipNumber: "",
    vaccination: "false",
    notes: "",
  });

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function Set(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  return (
    <form
      className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form, imageFile);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("form.id")} required>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.animalId}
            onChange={(e) => Set("animalId", e.target.value)}
            required
          />
        </Field>

        <Field label={t("form.name")}>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.name}
            onChange={(e) => Set("name", e.target.value)}
          />
        </Field>

        <Field label={t("form.species")}>
          <select
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.species}
            onChange={(e) => Set("species", e.target.value)}
          >
            <option value="dog">{t("form.dog")}</option>
            <option value="cat">{t("form.cat")}</option>
            <option value="other">{t("form.other")}</option>
          </select>
        </Field>

        <Field label={t("form.breed")}>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.breed}
            onChange={(e) => Set("breed", e.target.value)}
          />
        </Field>

        <Field label={t("form.gender")}>
          <select
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.gender}
            onChange={(e) => Set("gender", e.target.value)}
          >
            <option value="">{t("form.genderSelect")}</option>
            <option value="MALE">{t("form.male")}</option>
            <option value="FEMALE">{t("form.female")}</option>
          </select>
        </Field>

        <Field label={t("form.age")}>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.age}
            onChange={(e) => Set("age", e.target.value)}
            placeholder={t("form.agePlaceholder")}
          />
        </Field>

        <Field label={t("form.shelter")}>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.shelterId}
            onChange={(e) => Set("shelterId", e.target.value)}
            placeholder={t("form.shelterPlaceholder")}
          />
        </Field>

        <Field label={t("form.microchip")}>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.microchipNumber}
            onChange={(e) => Set("microchipNumber", e.target.value.replace(/\D/g, "").slice(0, 15))}
            inputMode="numeric"
            maxLength={15}
            pattern="\d{15}"
            title={t("form.microchipHint")}
          />
          <p className="mt-1 text-xs text-gray-400">{t("form.microchipHint")}</p>
        </Field>

        <Field label={t("form.vaccinated")}>
          <select
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.vaccination}
            onChange={(e) => Set("vaccination", e.target.value)}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </Field>

        <Field label={t("form.notes")} wide>
          <textarea
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={form.notes}
            onChange={(e) => Set("notes", e.target.value)}
            rows={3}
          />
        </Field>

        <Field label={t("form.image")} wide>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-purple-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
          />
          <p className="mt-1 text-xs text-gray-400">{t("form.imageHint")}</p>
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="mt-2 h-32 w-auto rounded-xl object-cover border border-gray-200" />
          )}
        </Field>
      </div>

      <button
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-purple-600 px-5 py-3 text-sm font-extrabold text-white shadow hover:bg-purple-700 disabled:opacity-60"
        type="submit"
        disabled={submitting}
      >
        {submitting ? t("form.submitting") : t("form.submit")}
      </button>
    </form>
  );
}

function Field({ label, children, required, wide }) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <div className="mb-1 text-xs font-extrabold text-gray-600">
        {label} {required ? <span className="text-pink-600">*</span> : null}
      </div>
      {children}
    </label>
  );
}
