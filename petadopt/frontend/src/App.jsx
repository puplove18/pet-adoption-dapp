import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout";
import AddPetPage from "./components/addPetPage";
import Home from "./pages/home";
import Pets from "./pages/pets";
import PetDetails from "./pages/petDetails";
import Login from "./pages/login";
import ProtectedRoute from "./components/protectedRoute";

export default function App() {
  return (
    <Routes>
      {/* public login */}
      <Route path="/login" element={<Login />} />

      {/* all other routes require auth */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/pets/register" element={<AddPetPage />} />
          <Route path="/pets/:id" element={<PetDetails />} />
        </Route>
      </Route>

      {/* catch-all redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
