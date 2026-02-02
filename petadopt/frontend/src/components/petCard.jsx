import { Link } from "react-router-dom";

export default function PetCard({ pet }) {
  return (
    <div className="petCard">
      <div className="petTop">
        <Link className = "petNameLink" to = {`/pets/${pet.animalId}`}>
          {pet.name ?? "Unnamed"}
        </Link>
        <span className = "petBadge">
          {pet.adoptionStatus ?? "UNKNOWN"}
        </span>
      </div>

      <div className="petInfo">
        <div><strong>Species:</strong>{pet.species}</div>
        <div><strong>Breed:</strong> {pet.breed}</div>
        <div><strong>Gender:</strong> {pet.gender}</div>
        <div><strong>Age:</strong> {pet.age}</div>
      </div>
    </div>
  );
}
