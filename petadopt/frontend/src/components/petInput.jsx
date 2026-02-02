import { useState } from "react";

export default function PetForm({ onSubmit, submitting }) {
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

  function Set(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="formGrid">
        <label className="field">
          <span>ID*</span>
          <input value={form.animalId} onChange={(e) => Set("animalId", e.target.value)} required />
        </label>

        <label className="field">
          <span>Name</span>
          <input value={form.name} onChange={(e) => Set("name", e.target.value)} />
        </label>

        <label className="field">
          <span>Species</span>
          <select value={form.species} onChange={(e) => Set("species", e.target.value)}>
            <option value="dog">dog</option>
            <option value="cat">cat</option>
            <option value="other">other</option>
          </select>
        </label>

        <label className="field">
          <span>Breed</span>
          <input value={form.breed} onChange={(e) => Set("breed", e.target.value)} />
        </label>

        <label className="field">
          <span>Gender</span>
          <select name="gender" value={form.gender} onChange={(e) => Set("gender", e.target.value)}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </label>

        <label className="field">
          <span>Age</span>
          <input value={form.age} onChange={(e) => Set("age", e.target.value)} placeholder="e.g., 3" />
        </label>

        <label className="field">
          <span>Shelter</span>
          <input value={form.shelterId} onChange={(e) => Set("shelterId", e.target.value)} placeholder="e.g., shelter A" />
        </label>

        <label className="field">
          <span>Microchip</span>
          <input value={form.microchipNumber} onChange={(e) => Set("microchipNumber", e.target.value)} />
        </label>

        <label className="field">
          <span>Vaccinated</span>
          <select value={form.vaccination} onChange={(e) => Set("vaccination", e.target.value)}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>

        <label className="field fieldWide">
          <span>Notes</span>
          <textarea value={form.notes} onChange={(e) => Set("notes", e.target.value)} rows={3} />
        </label>
      </div>

      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Pet"}
      </button>
    </form>
  );
}
