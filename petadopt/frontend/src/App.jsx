import { Routes, Route, Link } from 'react-router-dom'
import Layout from "./components/layout";
import Home from './pages/home'
import Pets from './pages/pets';
import PetDetails from './pages/petDetails';


  
export default function App() {
  return (
    <Routes>
      <Route element = {<Layout />}>
        <Route path = "/" element = {<Home />} />
        <Route path = "/pets" element = {<Pets />} />
        <Route path = "/pets/:id" element = {<PetDetails />} />
      </Route>
    </Routes>
  );
}
