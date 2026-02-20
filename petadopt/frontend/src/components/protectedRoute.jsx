import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getSession, clearSession } from "../lib/session";

export default function ProtectedRoute() {
  const s = getSession();
  const [status, setStatus] = useState(s?.org && s?.userId ? "checking" : "none");

  useEffect(() => {
    if (status !== "checking") return;

    // Validate the stored session against the live backend.
    // If the network was redeployed the old identity is gone and
    // the backend will return an error — clear the stale session.
    fetch("/api/animals", {
      headers: { "x-org": s.org, "x-user": s.userId },
    })
      .then((res) => {
        if (res.ok) {
          setStatus("ok");
        } else {
          clearSession();
          setStatus("none");
        }
      })
      .catch(() => {
        clearSession();
        setStatus("none");
      });
  }, []);            // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "none") return <Navigate to="/login" replace />;
  if (status === "checking") {
    // Brief loading indicator while we validate
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400 text-sm">
        Validating session…
      </div>
    );
  }
  return <Outlet />;
}
