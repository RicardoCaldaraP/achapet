/** Estrutura de todas as páginas: cabeçalho, conteúdo e rodapé com o gato espiando. */
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { GatoEspiando, Pata } from "./Pets.jsx";
import InstalarApp from "./InstalarApp.jsx";

export default function Layout() {
  const { logado, perfil, ehModerador, sair } = useAuth();
  const avisar = useAvisos();
  const navegar = useNavigate();

  async function fazerLogout() {
    await sair();
    avisar("Você saiu da sua conta.", "info");
    navegar("/");
  }

  return (
    <>
      <a className="visually-hidden-focusable" href="#conteudo">Pular para o conteúdo</a>
      <nav className="navbar navbar-expand-lg navbar-light ap-topo" aria-label="Navegação principal">
        <div className="container">
          <Link className="navbar-brand" to="/">
            <Pata />
            <b className="fw-bold">Acha<span>Pet</span></b>
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu"
                  aria-controls="menu" aria-expanded="false" aria-label="Abrir menu">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="menu">
            <ul className="navbar-nav me-auto">
              <li className="nav-item"><NavLink className="nav-link" to="/mural">Mural</NavLink></li>
              {logado && <li className="nav-item"><NavLink className="nav-link" to="/meus-anuncios">Meus anúncios</NavLink></li>}
              {ehModerador && <li className="nav-item"><NavLink className="nav-link" to="/moderacao">Moderação</NavLink></li>}
            </ul>
            <div className="d-flex flex-column flex-lg-row gap-2 py-2 py-lg-0">
              <Link className="btn btn-ap" to="/anuncios/novo"><i className="bi bi-plus-lg" /> Publicar anúncio</Link>
              {logado ? (
                <div className="dropdown">
                  <button className="btn btn-contorno dropdown-toggle w-100" data-bs-toggle="dropdown" aria-expanded="false">
                    <i className="bi bi-person-circle" /> {perfil?.nome?.split(" ")[0] ?? "Minha conta"}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li><Link className="dropdown-item" to="/conta">Minha conta</Link></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button className="dropdown-item" type="button" onClick={fazerLogout}>Sair</button></li>
                  </ul>
                </div>
              ) : (
                <Link className="btn btn-contorno" to="/entrar">Entrar</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main id="conteudo">
        <Outlet />
      </main>

      <footer className="ap-rodape py-4">
        <GatoEspiando />
        <div className="container d-flex flex-column flex-md-row justify-content-between gap-2">
          <p className="mb-0">AchaPet: projeto acadêmico de Desenvolvimento de Sistemas para Web (UVV), 2026.</p>
          <p className="mb-0"><Link to="/termos">Termos de uso e privacidade</Link></p>
        </div>
      </footer>
      <InstalarApp />
    </>
  );
}
