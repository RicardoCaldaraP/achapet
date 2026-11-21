/**
 * Mural geolocalizado: mapa + lista dos anúncios num raio de 1 a 20 km.
 * A busca usa a API REST do Supabase (RPC da função buscar_anuncios do banco),
 * que devolve só dados públicos e o local arredondado (~300 m).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { supabase } from "../lib/supabase.js";
import { CENTRO_PADRAO, ESPECIES, TIPOS } from "../lib/rotulos.js";
import { ItemLista, Vazio } from "../components/Comuns.jsx";

const PERIODOS = { "": "Qualquer data", 7: "Últimos 7 dias", 15: "Últimos 15 dias", 30: "Últimos 30 dias" };

const icone = (tipo) =>
  L.divIcon({ className: "pino-mapa", html: `<div class="pino ${tipo}"></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] });

function AoMoverMapa({ aoMover }) {
  useMapEvents({ moveend: (e) => aoMover(e.target.getCenter()) });
  return null;
}

function Recentralizar({ centro }) {
  const mapa = useMap();
  useEffect(() => {
    mapa.setView(centro);
  }, [centro, mapa]);
  return null;
}

export default function Mural() {
  const [params, setParams] = useSearchParams();
  const filtros = {
    tipo: params.get("tipo") ?? "",
    especie: params.get("especie") ?? "",
    periodo: params.get("periodo") ?? "",
    raio: Number(params.get("raio")) || 5,
  };
  const [centro, setCentro] = useState([
    Number(params.get("lat")) || CENTRO_PADRAO[0],
    Number(params.get("lng")) || CENTRO_PADRAO[1],
  ]);
  const [centroForcado, setCentroForcado] = useState(centro);
  const [anuncios, setAnuncios] = useState(null);
  const [erro, setErro] = useState(null);
  const [destaque, setDestaque] = useState(null);
  const refsItens = useRef({});

  useEffect(() => {
    document.title = "Mural | AchaPet";
  }, []);

  const buscar = useCallback(async () => {
    setErro(null);
    const desde = filtros.periodo
      ? new Date(Date.now() - Number(filtros.periodo) * 86400000).toISOString().slice(0, 10)
      : null;
    const { data, error } = await supabase.rpc("buscar_anuncios", {
      p_lat: centro[0],
      p_lng: centro[1],
      p_raio_m: filtros.raio * 1000,
      p_tipo: filtros.tipo || null,
      p_especie: filtros.especie || null,
      p_desde: desde,
    });
    if (error) {
      setErro("Não foi possível carregar os anúncios. Verifique sua conexão.");
      setAnuncios([]);
    } else {
      setAnuncios(data.map((a) => ({ ...a, cores: a.cores ?? "" })));
    }
  }, [centro, filtros.raio, filtros.tipo, filtros.especie, filtros.periodo]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  function mudarFiltro(campo, valor) {
    const novo = new URLSearchParams(params);
    if (valor === "" || valor == null) novo.delete(campo);
    else novo.set(campo, valor);
    setParams(novo, { replace: true });
  }

  function aoMover(c) {
    if (Math.abs(c.lat - centro[0]) + Math.abs(c.lng - centro[1]) > 0.003) setCentro([c.lat, c.lng]);
  }

  function pertoDeMim() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const c = [pos.coords.latitude, pos.coords.longitude];
      setCentro(c);
      setCentroForcado(c);
    });
  }

  function selecionar(codigo) {
    setDestaque(codigo);
    refsItens.current[codigo]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="container-fluid px-lg-4 py-3">
      <div className="mural">
        <aside className="d-flex flex-column gap-2">
          <form className="filtros" onSubmit={(e) => e.preventDefault()}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h1 className="h3 mb-0">Mural</h1>
              <button type="button" className="btn btn-sm btn-contorno" onClick={pertoDeMim}>
                <i className="bi bi-crosshair" /> Perto de mim
              </button>
            </div>
            <div className="row g-2">
              <div className="col-6">
                <select className="form-select form-select-sm" aria-label="Tipo" value={filtros.tipo}
                        onChange={(e) => mudarFiltro("tipo", e.target.value)}>
                  <option value="">Perdidos e encontrados</option>
                  {Object.entries(TIPOS).map(([v, r]) => <option key={v} value={v}>{r}s</option>)}
                </select>
              </div>
              <div className="col-6">
                <select className="form-select form-select-sm" aria-label="Espécie" value={filtros.especie}
                        onChange={(e) => mudarFiltro("especie", e.target.value)}>
                  <option value="">Todas as espécies</option>
                  {Object.entries(ESPECIES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </div>
              <div className="col-6">
                <select className="form-select form-select-sm" aria-label="Período" value={filtros.periodo}
                        onChange={(e) => mudarFiltro("periodo", e.target.value)}>
                  {Object.entries(PERIODOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small mb-0" htmlFor="raio">Raio: {filtros.raio} km</label>
                <input id="raio" type="range" className="form-range" min="1" max="20" step="1" value={filtros.raio}
                       onChange={(e) => mudarFiltro("raio", e.target.value)} />
              </div>
            </div>
          </form>
          <p className="small texto-suave mb-0" aria-live="polite">
            {anuncios === null
              ? "Carregando anúncios..."
              : erro ?? `${anuncios.length} anúncio(s) em ${filtros.raio} km. A posição no mapa é aproximada (cerca de 300 m).`}
          </p>
          <Link className="small fw-semibold" to={`/alertas?lat=${centro[0].toFixed(5)}&lng=${centro[1].toFixed(5)}&raio=${filtros.raio}`}>
            <i className="bi bi-bell" /> Receber e-mail quando aparecer anúncio nesta área
          </Link>
          <div className="lista d-flex flex-column gap-2">
            {anuncios?.length === 0 && !erro && (
              <Vazio>
                <p className="mb-2">Nenhum bichinho por aqui. Aumente o raio ou mude os filtros.</p>
                <Link className="btn btn-ap btn-sm" to="/anuncios/novo">Publicar anúncio</Link>
              </Vazio>
            )}
            {anuncios?.map((a) => (
              <ItemLista key={a.codigo} anuncio={a} destaque={destaque === a.codigo}
                         refItem={(el) => (refsItens.current[a.codigo] = el)}
                         onMouseEnter={() => setDestaque(a.codigo)} />
            ))}
          </div>
        </aside>

        <MapContainer id="mapa" center={centro} zoom={13} scrollWheelZoom aria-label="Mapa com os anúncios">
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
          <Recentralizar centro={centroForcado} />
          <AoMoverMapa aoMover={aoMover} />
          <Circle center={centro} radius={filtros.raio * 1000} pathOptions={{ color: "#3b2a20", weight: 1, fillOpacity: 0.04 }} />
          {anuncios?.map((a) => (
            <Marker key={a.codigo} position={[a.lat_aprox, a.lng_aprox]} icon={icone(a.tipo)}
                    eventHandlers={{ click: () => selecionar(a.codigo) }}>
              <Popup>
                <strong>{a.nome_pet || ESPECIES[a.especie]}</strong>
                <br />
                {TIPOS[a.tipo]}{a.bairro ? `, ${a.bairro}` : ""}
                <br />
                <Link to={`/a/${a.codigo}`}>Ver anúncio</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
