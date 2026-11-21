/**
 * Alertas por região: o usuário marca uma área no mapa e recebe um e-mail
 * quando alguém publica um anúncio ali (funcionalidade complementar do MVP).
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";
import { ESPECIES, TIPOS } from "../lib/rotulos.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { Carregando, ErroCampo, Vazio } from "../components/Comuns.jsx";
import SeletorLocal from "../components/SeletorLocal.jsx";

const LIMITE = 5;

function descricao(alerta) {
  const oque = alerta.especie ? ESPECIES[alerta.especie] : "Qualquer animal";
  const tipo = alerta.tipo ? TIPOS[alerta.tipo].toLowerCase() : "perdido ou encontrado";
  const raio = alerta.raio_m >= 1000 ? `${(alerta.raio_m / 1000).toLocaleString("pt-BR")} km` : `${alerta.raio_m} m`;
  return `${oque}, ${tipo}, num raio de ${raio}`;
}

export default function Alertas() {
  const { perfil } = useAuth();
  const avisar = useAvisos();
  const [params] = useSearchParams();
  const [alertas, setAlertas] = useState(null);
  const [ponto, setPonto] = useState(() => {
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    return lat && lng ? { latitude: lat, longitude: lng } : { latitude: null, longitude: null };
  });
  const [raioKm, setRaioKm] = useState(Number(params.get("raio")) || 3);
  const [especie, setEspecie] = useState("");
  const [tipo, setTipo] = useState("");
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setAlertas(await api("/alertas"));
    } catch (erro) {
      avisar(erro.message, "danger");
      setAlertas([]);
    }
  }, [avisar]);

  useEffect(() => {
    document.title = "Alertas da minha região | AchaPet";
    carregar();
  }, [carregar]);

  async function criar(e) {
    e.preventDefault();
    if (ponto.latitude == null) {
      setErros({ latitude: "Marque no mapa o centro da área que você quer acompanhar." });
      return;
    }
    setSalvando(true);
    setErros({});
    try {
      await api("/alertas", {
        metodo: "POST",
        corpo: { ...ponto, raio_m: raioKm * 1000, especie, tipo },
      });
      avisar("Alerta criado. Avisaremos por e-mail quando sair um anúncio nessa área.");
      await carregar();
    } catch (erro) {
      setErros(erro.detalhes ?? {});
      avisar(erro.message, "danger");
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(alerta) {
    await api(`/alertas/${alerta.id}`, { metodo: "PATCH", corpo: { ativo: !alerta.ativo } });
    avisar(alerta.ativo ? "Alerta pausado." : "Alerta reativado.", "info");
    await carregar();
  }

  async function excluir(alerta) {
    if (!window.confirm("Excluir este alerta?")) return;
    await api(`/alertas/${alerta.id}`, { metodo: "DELETE" });
    avisar("Alerta excluído.", "info");
    await carregar();
  }

  if (!alertas) return <Carregando />;
  const noLimite = alertas.length >= LIMITE;

  return (
    <div className="container py-5" style={{ maxWidth: 820 }}>
      <h1 className="mb-1">Alertas da minha região</h1>
      <p className="texto-suave mb-4">
        Marque uma área no mapa e receba um e-mail em <strong>{perfil?.email}</strong> sempre que alguém
        publicar um anúncio nela. Você pode ter até {LIMITE} alertas.
      </p>

      <section className="mb-5">
        <h2 className="h4 mb-3">Meus alertas</h2>
        {alertas.length ? (
          <ul className="list-unstyled d-grid gap-2 mb-0">
            {alertas.map((a) => (
              <li key={a.id} className="painel d-flex flex-wrap align-items-center gap-2 py-3">
                <i className={`bi ${a.ativo ? "bi-bell-fill text-warning" : "bi-bell-slash texto-suave"} fs-4`} aria-hidden="true" />
                <div className="me-auto">
                  <div className="fw-semibold">{descricao(a)}</div>
                  <small className="texto-suave">
                    {a.ativo ? "Ativo" : "Pausado"} ·{" "}
                    <Link to={`/mural?lat=${a.latitude}&lng=${a.longitude}&raio=${Math.max(1, Math.round(a.raio_m / 1000))}`}>
                      ver a área no mural
                    </Link>
                  </small>
                </div>
                <button type="button" className="btn btn-sm btn-contorno" onClick={() => alternar(a)}>
                  {a.ativo ? "Pausar" : "Reativar"}
                </button>
                <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => excluir(a)}>Excluir</button>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio><p className="mb-0">Você ainda não tem alertas. Crie o primeiro abaixo.</p></Vazio>
        )}
      </section>

      <section>
        <h2 className="h4 mb-3">Novo alerta</h2>
        {noLimite ? (
          <p className="texto-suave">Você chegou ao limite de {LIMITE} alertas. Exclua um para criar outro.</p>
        ) : (
          <form className="painel" onSubmit={criar} noValidate>
            <label className="form-label fw-semibold">Centro da área</label>
            <SeletorLocal latitude={ponto.latitude} longitude={ponto.longitude} raioM={raioKm * 1000} zoomPonto={12}
                          aoMarcar={(latitude, longitude) => setPonto({ latitude, longitude })} />
            <ErroCampo erro={erros.latitude ?? erros.longitude} />

            <div className="row g-3 mt-1">
              <div className="col-md-4">
                <label className="form-label" htmlFor="raio-alerta">Raio: {raioKm} km</label>
                <input id="raio-alerta" type="range" className="form-range" min="1" max="20" step="1"
                       value={raioKm} onChange={(e) => setRaioKm(Number(e.target.value))} />
                <ErroCampo erro={erros.raio_m} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="especie-alerta">Espécie</label>
                <select id="especie-alerta" className="form-select" value={especie} onChange={(e) => setEspecie(e.target.value)}>
                  <option value="">Todas</option>
                  {Object.entries(ESPECIES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="tipo-alerta">Tipo</label>
                <select id="tipo-alerta" className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="">Perdidos e encontrados</option>
                  {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}s</option>)}
                </select>
              </div>
            </div>

            <button className="btn btn-ap mt-3" type="submit" disabled={salvando}>
              <i className="bi bi-bell" /> {salvando ? "Criando..." : "Criar alerta"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
