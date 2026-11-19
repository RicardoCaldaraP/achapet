import { Link } from "react-router-dom";
import { CachorroDormindo } from "../components/Pets.jsx";

export default function NaoEncontrado() {
  return (
    <div className="container py-5 text-center">
      <CachorroDormindo className="mb-2" />
      <p className="titulo-pet display-4 mb-0">404</p>
      <h1 className="h2">Página não encontrada</h1>
      <p className="texto-suave mx-auto medida">O anúncio ou a página que você procura não existe mais.</p>
      <div className="d-flex justify-content-center gap-2 mt-3">
        <Link className="btn btn-ap" to="/mural">Ir para o mural</Link>
        <Link className="btn btn-contorno" to="/">Página inicial</Link>
      </div>
    </div>
  );
}
