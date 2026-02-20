import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession } from "../lib/session";
import { apiGet } from "../lib/api";
import PetCard from "../components/petCard";
import { useTranslation } from "../i18n/LanguageContext";


export default function Home() {
  const session = getSession();
  const role = session?.role;
  const { t } = useTranslation();

  // Check if user has staff permissions (adoption center / vet)
  const isStaff = role === "adoption_center" || role === "veterinarian";

  // Featured pets rendered with ledger
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet("/api/animals");
        setPets(Array.isArray(data) ? data : []);
      } catch {
        setPets([]);
      } finally {
        setLoadingPets(false);
      }
    })();
  }, []);

  const roleDisplay = {
    adoption_center: t("role.staff.full"),
    veterinarian: t("role.vet.full"),
    adopter: t("role.adopter.full"),
  };

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="grid gap-6 rounded-3xl border border-[var(--border)] bg-white p-8 shadow-sm md:grid-cols-2 md:p-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-extrabold text-purple-700">
            {t("home.badge")}
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900">
            {t("home.title")}
          </h1>

          <p className="mt-3 max-w-xl text-gray-600">
            {t("home.desc")}
          </p>

          {/* Current role display */}
          <div className="mt-5">
            <div className="text-xs font-extrabold text-gray-600">{t("home.yourRole")}</div>
            <div className="mt-2 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
              <div className="text-sm font-bold text-purple-900">
                {roleDisplay[role] || role}
              </div>
              <div className="mt-1 text-xs text-purple-700">
                {isStaff
                  ? t("home.staffAccess")
                  : t("home.publicAccess")}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center justify-center rounded-2xl bg-purple-600 px-6 py-3 text-sm font-extrabold text-white shadow hover:bg-purple-700"
              to="/pets"
            >
              {t("home.browsePets")}
            </Link>

            {(role === "adoption_center" || role === "veterinarian") && (
              <Link
                className="inline-flex items-center justify-center rounded-2xl border border-purple-200 bg-white px-6 py-3 text-sm font-extrabold text-purple-700 shadow-sm hover:bg-purple-50"
                to="/pets"
              >
                {t("home.addNewPet")}
              </Link>
            )}
          </div>
        </div>

        {/* Hero image */}
        <div
          className="rounded-3xl bg-gray-100 bg-cover bg-center min-h-[300px]"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        />
      </div>

      {/* FEATURES */}
      <div className="grid gap-4 md:grid-cols-3">
        <Feature title={t("home.feat1.title")} desc={t("home.feat1.desc")} icon="👀" />
        <Feature title={t("home.feat2.title")} desc={t("home.feat2.desc")} icon="🔒" />
        <Feature title={t("home.feat3.title")} desc={t("home.feat3.desc")} icon="🛡️" />
      </div>

      {/* FEATURED PETS (ledger) */}
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">{t("home.featured")}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {t("home.featuredDesc")}
            </p>
          </div>
          <Link className="text-sm font-bold text-purple-700 hover:underline" to="/pets">
            {t("home.viewAll")}
          </Link>
        </div>

        {loadingPets ? (
          <div className="mt-5 text-sm text-gray-600">{t("home.loading")}</div>
        ) : pets.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            {t("home.empty")}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pets.slice(0, 4).map((pet) => (
              <PetCard key={pet.animalId} pet={pet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Feature({ title, desc, icon }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="text-2xl">{icon}</div>
      <div className="mt-2 text-sm font-extrabold text-gray-900">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{desc}</div>
    </div>
  );
}
