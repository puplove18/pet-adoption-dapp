import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="container">
      <div className="homeHero">
        <h1>Pet Adoption Ledger</h1>
        <p className="muted">
          A blockchain-backed adoption management prototype using Hyperledger Fabric.
        </p>
        <Link className="btn" to="/pets">Browse Pets</Link>
      </div>
    </div>
  );
}
