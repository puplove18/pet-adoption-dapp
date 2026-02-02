import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export default function PetDetails() {
  const { id } = useParams();
  const [pet, setPet] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setError("");
    setLoading(true);
    apiGet(`/api/animals/${id}`)
      .then(setPet)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container"><p>Loading pet…</p></div>;
  if (error) return <div className="container"><div className="errorBox">{error}</div></div>;
  if (!pet) return <div className="container"><p>Not found.</p></div>;

  return (
    <div className="container">
      <div className="detailHero">
        <div>
          <h1>{pet.name ?? "Unnamed"}</h1>
          <p className="muted">{pet.species} • {pet.breed}</p>
        </div>
        <span className={`badge ${pet.adoptionStatus === "AVAILABLE" ? "badgeGreen" : "badgeGray"}`}>
          {pet.adoptionStatus ?? "UNKNOWN"}
        </span>
      </div>

      <div className="detailGrid">
        <div className="panel">
          <h2>Overview</h2>
          <div className="kvRow"><span className="k">ID</span><span className="v">{pet.animalId}</span></div>
          <div className="kvRow"><span className="k">Species</span><span className="v">{pet.species}</span></div>
          <div className="kvRow"><span className="k">Breed</span><span className="v">{pet.breed}</span></div>
          <div className="kvRow"><span className="k">Gender</span><span className="v">{pet.gender}</span></div>
          <div className="kvRow"><span className="k">Age</span><span className="v">{pet.age}</span></div>
          <div className="kvRow"><span className="k">Shelter</span><span className="v">{pet.shelterId}</span></div>
          <div className="kvRow"><span className="k">Doc Type</span><span className="v">{pet.docType}</span></div>
        </div>

        <div className="panel">
          <h2>Notes</h2>
          <p className="muted">{pet.notes ?? "No notes provided."}</p>
          <div style={{ marginTop: 12 }}>
            <Link className="btnSecondary" to="/pets">← Back to list</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
