import { useState } from "react";
import PetForm from "./petForm"; 
import { apiPost, apiUploadImage } from "./api"; 
import { useTranslation } from "../i18n/LanguageContext";


export default function AddPetPage() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreatePet(form, imageFile) {
    setSubmitting(true);
    setMessage("");

    try {
      await apiPost("/api/animals", form);
      // Upload image if provided (off-chain, optional)
      if (imageFile) {
        await apiUploadImage(form.animalId, imageFile);
      }
      setMessage(t("addPet.success"));
    } catch (err) {
      setMessage(t("addPet.fail") + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {message && (
        <div className="mb-4 rounded-xl border p-3 text-sm">
          {message}
        </div>
      )}

      <PetForm
        onSubmit={handleCreatePet}
        submitting={submitting}
      />
    </div>
  );
}
