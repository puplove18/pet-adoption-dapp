import { Link, Outlet, NavLink } from "react-router-dom";

export default function Layout() {
  return (
    <>
      <header className="topbar">
        <div className="container navRow">
          <Link className="brand" to="/">powLedger</Link>

          <nav className="navLinks">
            <NavLink to="/" end className={({isActive}) => isActive ? "active" : ""}>Home</NavLink>
            <NavLink to="/pets" className={({isActive}) => isActive ? "active" : ""}>Pets</NavLink>
          </nav>
        </div>
      </header>

      <main className="container page">
        <Outlet />
      </main>
    </>
  );
}
