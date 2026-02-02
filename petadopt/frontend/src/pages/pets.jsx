import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { getRole, setRole } from "../lib/role";
import PetCard from "../components/petCard";
import PetForm from "../components/petInput";



export default function Pets() {
  const [role, setRoleState] = useState(getRole());     // public, adoption center, vet
  const isStaff = role === "adoption center" || role === "vet";

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await apiGet("/api/animals");
      setPets(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function CreatePet(form) {
    setSubmitting(true);
    setError("");
    try {
      await apiPost("/api/animals", form);
      await load(); 
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <div className="pageHeader">
        <div>
          <h1>Pets</h1>
          <p className="muted">Available animals currently registered on the ledger.</p>
        </div>

      {/* role switcher, later i will replace this with proper login maybe */}
      <div className = "roleSwitcher">
        <label className = "muted" style={{ fontSize: 14 }}>Role</label>
        <select
          value={role}
          onChange={(e) => {
            const r = e.target.value;
            setRole(r);
            setRoleState(r);
          }}
        >
          <option value="public">Public User</option>
          <option value="adoption center">Adoption Center Staff</option>
          <option value="vet">Veterinarian</option>
        </select>
      </div>
    </div>

    {/* Only staff can see pet registration form */}
    {isStaff && (
      <div className="panel">
        <h2>Create new pet</h2>
        <PetForm onSubmit={CreatePet} submitting={submitting} />
      </div>
    )}

    {error && <div className="errorBox">{error}</div>}

    {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="petGrid">
          {pets.map((pet) => (
            <PetCard key={pet.animalId} pet={pet} />
          ))}
        </div>
      )}
    </div>
  );
}
