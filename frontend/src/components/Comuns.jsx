/** Pequenos componentes reutilizados nas páginas. */
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { urlFoto } from "../lib/supabase.js";
import { ESPECIES, PORTES, STATUS, TIPOS, tituloAnuncio } from "../lib/rotulos.js";
import { distancia, tempoRelativo } from "../lib/formatos.js";
import { CachorroDormindo, Pata } from "./Pets.jsx";

export function Etiqueta({ tipo, children }) {
  return <span className={`etiqueta etiqueta-${tipo}`}>{children}</span>;
}

/** Etiqueta de tipo (perdido/encontrado) ou de status quando não está ativo. */
export function EtiquetaAnuncio({ anuncio }) {
  if (anuncio.expirado && anuncio.status === "ativo") return <Etiqueta tipo="expirado">Expirado</Etiqueta>;
  if (anuncio.status && anuncio.status !== "ativo") return <Etiqueta tipo={anuncio.status}>{STATUS[anuncio.status]}</Etiqueta>;
  return <Etiqueta tipo={anuncio.tipo}>{TIPOS[anuncio.tipo]}</Etiqueta>;
}

export function Foto({ caminho, alt, className = "" }) {
  return caminho ? (
    <img className={className} src={urlFoto(caminho)} alt={alt} loading="lazy" />
  ) : (
    <div className={`${className} sem-foto`} role="img" aria-label="Anúncio sem foto" />
  );
}

export function CardAnuncio({ anuncio }) {
  return (
    <Link className={`anuncio-card ${anuncio.tipo}`} to={`/a/${anuncio.codigo}`}>
      <Foto className="capa" caminho={anuncio.foto_capa} alt={`Foto de ${tituloAnuncio(anuncio).toLowerCase()}`} />
      <div className="corpo">
        <div><EtiquetaAnuncio anuncio={anuncio} /></div>
        <h3>{anuncio.nome_pet || ESPECIES[anuncio.especie]}</h3>
        <div className="meta">
          {anuncio.nome_pet ? `${ESPECIES[anuncio.especie]}, porte` : "Porte"} {PORTES[anuncio.porte].toLowerCase()},{" "}
          {anuncio.cores.join(", ")}
        </div>
        <div className="meta d-flex flex-wrap column-gap-3">
          <span><i className="bi bi-geo-alt" aria-hidden="true" /> {anuncio.bairro || anuncio.cidade || "Local no mapa"}</span>
          <span><i className="bi bi-calendar3" aria-hidden="true" /> {tempoRelativo(anuncio.data_ocorrencia)}</span>
        </div>
      </div>
    </Link>
  );
}

/** Linha compacta usada no mural e nas correspondências. */
export function ItemLista({ anuncio, destaque, onMouseEnter, refItem }) {
  return (
    <Link
      ref={refItem}
      className={`item-lista ${anuncio.tipo} ${destaque ? "destaque" : ""}`}
      to={`/a/${anuncio.codigo}`}
      onMouseEnter={onMouseEnter}
    >
      <Foto caminho={anuncio.foto_capa} alt="" />
      <div>
        <strong>{anuncio.nome_pet || ESPECIES[anuncio.especie]}</strong>{" "}
        <Etiqueta tipo={anuncio.tipo}>{TIPOS[anuncio.tipo]}</Etiqueta>
        <div className="small texto-suave">
          {anuncio.nome_pet ? ESPECIES[anuncio.especie] : `Porte ${PORTES[anuncio.porte].toLowerCase()}`},{" "}
          {anuncio.cores || "cor não informada"}
        </div>
        <div className="small">
          {anuncio.distancia_m != null && `${distancia(anuncio.distancia_m)} daqui, `}
          {anuncio.bairro ? `${anuncio.bairro}, ` : ""}
          {anuncio.data_ocorrencia?.split("-").reverse().join("/")}
        </div>
      </div>
    </Link>
  );
}

export function Vazio({ children }) {
  return (
    <div className="vazio">
      <CachorroDormindo />
      {children}
    </div>
  );
}

export function Carregando({ texto = "Carregando..." }) {
  return (
    <div className="carregando" role="status">
      <Pata />
      <span>{texto}</span>
    </div>
  );
}

export function AvisoGolpe() {
  return (
    <div className="aviso-golpe" role="note">
      <strong><i className="bi bi-shield-exclamation" /> Cuidado com golpes</strong>
      Nunca pague para receber um animal de volta nem faça Pix antes de ver o pet pessoalmente.
      Golpistas usam fotos editadas, até com inteligência artificial. Combine o encontro em local público.
    </div>
  );
}

/** Só deixa entrar quem está logado (e, se pedido, só moderadores). */
export function RotaProtegida({ children, moderador = false }) {
  const { logado, carregando, ehModerador, perfil } = useAuth();
  const local = useLocation();
  if (carregando || (moderador && logado && !perfil)) return <Carregando />;
  if (!logado) return <Navigate to={`/entrar?voltar=${encodeURIComponent(local.pathname)}`} replace />;
  if (moderador && !ehModerador) return <Navigate to="/" replace />;
  return children;
}

/** Mensagens de erro de um campo do formulário. */
export function ErroCampo({ erro }) {
  return erro ? <div className="invalid-feedback">{erro.message}</div> : null;
}
