import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { ESPECIES } from "../lib/rotulos.js";
import { dataBR, diasAte } from "../lib/formatos.js";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { Carregando, Etiqueta, EtiquetaAnuncio, Foto, Vazio } from "../components/Comuns.jsx";

export default function MeusAnuncios() {
  const [lista, setLista] = useState(null);
  const avisar = useAvisos();

  const carregar = () => api("/anuncios/meus").then(setLista);
  useEffect(() => {
    document.title = "Meus anúncios | AchaPet";
    carregar();
  }, []);

  async function renovar(codigo) {
    await api(`/anuncios/${codigo}/renovar`, { metodo: "POST" });
    avisar("Anúncio renovado por mais 30 dias.");
    carregar();
  }

  if (!lista) return <Carregando />;

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <h1 className="mb-0">Meus anúncios</h1>
        <Link className="btn btn-ap" to="/anuncios/novo"><i className="bi bi-plus-lg" /> Novo anúncio</Link>
      </div>
      {lista.length ? (
        <div className="d-flex flex-column gap-2">
          {lista.map((a) => (
            <div key={a.codigo} className={`item-lista ${a.tipo}`} style={{ gridTemplateColumns: "82px 1fr auto" }}>
              <Foto caminho={a.foto_capa} alt="" />
              <div>
                <Link className="fw-bold fs-5 text-decoration-none" to={`/a/${a.codigo}`}>{a.nome_pet || ESPECIES[a.especie]}</Link>
                <div className="d-flex flex-wrap gap-1 my-1">
                  <Etiqueta tipo={a.tipo}>{a.tipo === "perdido" ? "Perdido" : "Encontrado"}</Etiqueta>
                  {(a.status !== "ativo" || a.expirado) && <EtiquetaAnuncio anuncio={a} />}
                </div>
                <div className="small texto-suave">
                  Código {a.codigo}, publicado em {dataBR(a.criado_em)}
                  {a.status === "ativo" && !a.expirado && `, expira em ${diasAte(a.expira_em)} dia(s)`}
                </div>
              </div>
              <div className="d-flex flex-column gap-1 justify-content-center">
                {["ativo", "expirado"].includes(a.status) && (
                  <>
                    <button className="btn btn-sm btn-contorno" type="button" onClick={() => renovar(a.codigo)}>Renovar</button>
                    <Link className="btn btn-sm btn-contorno" to={`/a/${a.codigo}/editar`}>Editar</Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Vazio>
          <p className="fs-5 mb-1">Você ainda não publicou nenhum anúncio.</p>
          <p className="texto-suave">Perdeu ou encontrou um animal? Leva uns 3 minutos.</p>
          <Link className="btn btn-ap" to="/anuncios/novo">Publicar anúncio</Link>
        </Vazio>
      )}
    </div>
  );
}
