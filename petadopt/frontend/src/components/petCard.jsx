import { Link } from "react-router-dom";
import { useTranslation } from "../i18n/LanguageContext";

function badgeClass(status) {
  const base = "rounded-full border px-3 py-1 text-xs font-bold";
  const s = (status ?? "").toUpperCase();
  if (s === "AVAILABLE") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (s === "RESERVED")  return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  if (s === "ADOPTED")   return `${base} bg-gray-50 text-gray-700 border-gray-200`;
  return `${base} bg-pink-50 text-pink-700 border-pink-200`;
}

export default function PetCard({ pet }) {
  const { t } = useTranslation();
  const status = pet.adoptionStatus ?? "UNKNOWN";
  const statusLabel = { AVAILABLE: t("pets.available"), RESERVED: t("pets.reserved"), ADOPTED: t("pets.adopted") }[status.toUpperCase()] ?? status;

  // off-chain image by ID (served from pet_data/images via backend)
  const imageUrl = pet?.animalId ? `/pet_images/${pet.animalId}.jpg` : null;

  // age display
  const age = pet?.age === -1 || pet?.age === "-1" ? t("card.unknown") : (pet?.age ?? "—");

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {/* IMAGE */}
      <div className="h-48 w-full overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={pet?.name ?? t("card.unnamed")}
            className="h-full w-full object-cover transition hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.classList.add("flex", "items-center", "justify-center");
              const span = document.createElement("span");
              span.textContent = "🐾";
              span.className = "text-6xl opacity-30";
              e.currentTarget.parentElement.appendChild(span);
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-6xl opacity-30">🐾</span>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <Link
              className="text-lg font-extrabold text-gray-900 hover:underline"
              to={`/pets/${pet.animalId}`}
            >
              {pet.name ?? t("card.unnamed")}
            </Link>
            <div className="mt-1 text-sm text-gray-500">
              {pet.species} • {pet.breed || "—"}
            </div>
          </div>

          <span className={badgeClass(status)}>{statusLabel}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Mini k={t("card.gender")} v={pet.gender || "—"} />
          <Mini k={t("card.age")} v={age} />
        </div>
      </div>
    </div>
  );
}

function Mini({ k, v }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-500">{k}</div>
      <div className="font-semibold text-gray-900">{v}</div>
    </div>
  );
}
