import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { ESPECIES, MOTIVOS, STATUS, TIPOS } from "../lib/rotulos.js";
import { dataBR } from "../lib/formatos.js";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { Carregando, Etiqueta, Foto, Vazio } from "../components/Comuns.jsx";

export default function Moderacao() {
  const [pendentes, setPendentes] = useState(null);
  const avisar = useAvisos();
  const carregar = () => api("/moderacao/denuncias").then(setPendentes);

  useEffect(() => {
    document.title = "Moderação | AchaPet";
    carregar();
  }, []);

  async function decidir(codigo, decisao) {
    const r = await api(`/moderacao/anuncios/${codigo}/decisao`, { metodo: "POST", corpo: { decisao } });
    avisar(r.mensagem);
    carregar();
  }

  if (!pendentes) return <Carregando />;

  return (
    <div className="container py-4">
      <h1 className="mb-1">Moderação</h1>
      <p className="texto-suave mb-4">Anúncios com denúncias pendentes. Com 3 denúncias o anúncio sai do ar sozinho até a sua decisão.</p>
      {pendentes.length === 0 && <Vazio><p className="fs-5 mb-0">Nenhuma denúncia pendente. Tudo tranquilo por aqui.</p></Vazio>}
      {pendentes.map((a) => (
        <div className="painel mb-3" key={a.codigo}>
          <div className="row g-3">
            <div className={`col-sm-3 col-lg-2 ${a.tipo}`}>
              <Foto caminho={a.foto_capa} alt="" className="w-100 rounded-3" />
            </div>
            <div className="col-sm-9 col-lg-10">
              <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                <Link className="fw-bold fs-5" to={`/a/${a.codigo}`}>{a.nome_pet || ESPECIES[a.especie]} ({TIPOS[a.tipo].toLowerCase()})</Link>
                <Etiqueta tipo={a.status}>{STATUS[a.status]}</Etiqueta>
                <span className="badge text-bg-danger">{a.denuncias.length} denúncia(s)</span>
              </div>
              <p className="small texto-suave mb-2">Código {a.codigo}, por {a.autor.nome} ({a.autor.email})</p>
              <ul className="small mb-3">
                {a.denuncias.map((d, i) => (
                  <li key={i}><strong>{MOTIVOS[d.motivo]}</strong>{d.detalhe && `: ${d.detalhe}`} <span className="texto-suave">({dataBR(d.criado_em)})</span></li>
                ))}
              </ul>
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-danger" type="button" onClick={() => decidir(a.codigo, "remover")}>Remover anúncio</button>
                <button className="btn btn-contorno" type="button" onClick={() => decidir(a.codigo, "manter")}>Manter no ar</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
