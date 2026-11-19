/** Página do anúncio: link curto /a/CODIGO, compartilhamento, contato protegido e gestão. */
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Circle, MapContainer, TileLayer } from "react-leaflet";
import { api } from "../lib/api.js";
import { urlFoto } from "../lib/supabase.js";
import { ESPECIES, MOTIVOS, PERFIS, PORTES, SEXOS, tituloAnuncio } from "../lib/rotulos.js";
import { dataBR, diasAte, linkWhatsApp, localTexto, telefoneBR } from "../lib/formatos.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { AvisoGolpe, Carregando, Etiqueta, EtiquetaAnuncio, ItemLista, Vazio } from "../components/Comuns.jsx";
import { Cachorro } from "../components/Pets.jsx";
import NaoEncontrado from "./NaoEncontrado.jsx";

export default function Anuncio() {
  const { codigo } = useParams();
  const { logado, carregando: carregandoSessao } = useAuth();
  const avisar = useAvisos();
  const navegar = useNavigate();
  const [anuncio, setAnuncio] = useState(undefined);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [correspondencias, setCorrespondencias] = useState([]);
  const [copiado, setCopiado] = useState(false);
  const [denuncia, setDenuncia] = useState({ motivo: "golpe", detalhe: "" });

  const carregar = useCallback(async () => {
    try {
      const a = await api(`/anuncios/${codigo}`);
      setAnuncio(a);
      document.title = `${tituloAnuncio(a)} | AchaPet`;
      if (a.eh_autor && a.status === "ativo") {
        setCorrespondencias(await api(`/anuncios/${codigo}/correspondencias`));
      }
    } catch {
      setAnuncio(null);
    }
  }, [codigo]);

  useEffect(() => {
    if (!carregandoSessao) carregar();
  }, [carregar, carregandoSessao, logado]);

  if (anuncio === undefined) return <Carregando />;
  if (anuncio === null) return <NaoEncontrado />;

  const link = `${window.location.origin}/a/${anuncio.codigo}`;
  const textoCompartilhar = `${tituloAnuncio(anuncio)} em ${anuncio.bairro || anuncio.cidade || "Grande Vitória"}. Viu este animal? Veja o anúncio: ${link}`;

  async function acao(rota, mensagem) {
    try {
      const atualizado = await api(`/anuncios/${anuncio.codigo}/${rota}`, { metodo: "POST" });
      setAnuncio(atualizado);
      avisar(mensagem);
    } catch (e) {
      avisar(e.message, "warning");
    }
  }

  async function excluir() {
    if (!window.confirm("Excluir este anúncio e as fotos? Não dá para desfazer.")) return;
    await api(`/anuncios/${anuncio.codigo}`, { metodo: "DELETE" });
    avisar("Anúncio excluído.");
    navegar("/meus-anuncios");
  }

  async function enviarDenuncia(e) {
    e.preventDefault();
    try {
      const r = await api(`/anuncios/${anuncio.codigo}/denuncias`, { metodo: "POST", corpo: denuncia });
      avisar(r.mensagem);
      if (r.status === "oculto") navegar("/mural");
    } catch (erro) {
      avisar(erro.message, "warning");
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
    } catch {
      window.prompt("Copie o link:", link);
    }
  }

  return (
    <div className="container py-4">
      {anuncio.status === "reencontrado" && (
        <div className="selo-reencontrado mb-4"><Cachorro /> Este animal já voltou para casa. Obrigado a todos que ajudaram!</div>
      )}
      {anuncio.status === "oculto" && <div className="alert alert-warning">Este anúncio recebeu denúncias e está oculto até a análise da moderação.</div>}
      {anuncio.status === "removido" && <div className="alert alert-danger">Este anúncio foi removido pela moderação.</div>}
      {anuncio.expirado && (
        <div className="alert alert-secondary">Este anúncio expirou{anuncio.eh_autor && ". Renove para ele voltar ao mapa"}.</div>
      )}

      <div className="row g-4">
        <div className={`col-lg-6 ${anuncio.tipo}`}>
          {anuncio.fotos.length ? (
            <>
              <img className="galeria-principal" src={urlFoto(anuncio.fotos[fotoAtiva])} alt={`Foto de ${tituloAnuncio(anuncio).toLowerCase()}`} />
              {anuncio.fotos.length > 1 && (
                <div className="miniaturas d-flex gap-2 mt-2">
                  {anuncio.fotos.map((f, i) => (
                    <button key={f} type="button" className="p-0 border-0 bg-transparent" onClick={() => setFotoAtiva(i)} aria-label={`Ver foto ${i + 1}`}>
                      <img src={urlFoto(f)} alt="" className={i === fotoAtiva ? "ativa" : ""} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="galeria-principal sem-foto" role="img" aria-label="Anúncio sem foto" />
          )}
        </div>

        <div className="col-lg-6">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <Etiqueta tipo={anuncio.tipo}>{anuncio.tipo === "perdido" ? "Perdido" : "Encontrado"}</Etiqueta>
            {anuncio.status !== "ativo" && <EtiquetaAnuncio anuncio={anuncio} />}
          </div>
          <h1 className="mb-1">{anuncio.nome_pet || ESPECIES[anuncio.especie]}</h1>
          <p className="texto-suave fs-5">
            {anuncio.tipo === "perdido" ? "Visto pela última vez" : "Encontrado"} em{" "}
            {localTexto(anuncio) || "local marcado no mapa"}, {dataBR(anuncio.data_ocorrencia)}
          </p>

          <dl className="row ficha">
            <div className="col-6"><dt>Espécie</dt><dd>{ESPECIES[anuncio.especie]}</dd></div>
            <div className="col-6"><dt>Porte</dt><dd>{PORTES[anuncio.porte]}</dd></div>
            <div className="col-6"><dt>Sexo</dt><dd>{SEXOS[anuncio.sexo]}</dd></div>
            <div className="col-6"><dt>Cores</dt><dd className="text-capitalize">{anuncio.cores.join(", ")}</dd></div>
            {anuncio.raca && <div className="col-6"><dt>Raça</dt><dd>{anuncio.raca}</dd></div>}
            <div className="col-6"><dt>Código</dt><dd>{anuncio.codigo}</dd></div>
          </dl>
          {anuncio.descricao && <p className="medida" style={{ whiteSpace: "pre-line" }}>{anuncio.descricao}</p>}

          {anuncio.eh_autor && anuncio.detalhe_oculto && (
            <p className="small border-start border-3 ps-2">
              <strong>Seu detalhe secreto:</strong> {anuncio.detalhe_oculto}
              <br /><span className="texto-suave">Pergunte isso a quem disser ser o tutor. Só você vê este campo.</span>
            </p>
          )}

          <div className="d-flex flex-wrap gap-2 my-3">
            <a className="btn btn-whatsapp" href={linkWhatsApp(textoCompartilhar)} target="_blank" rel="noopener noreferrer">
              <i className="bi bi-whatsapp" /> Compartilhar no WhatsApp
            </a>
            <button className="btn btn-contorno" type="button" onClick={copiarLink}>
              <i className={`bi ${copiado ? "bi-check2" : "bi-link-45deg"}`} /> {copiado ? "Link copiado" : "Copiar link"}
            </button>
            <Link className="btn btn-contorno" to={`/a/${anuncio.codigo}/cartaz`} target="_blank">
              <i className="bi bi-printer" /> Cartaz para imprimir
            </Link>
          </div>

          {!anuncio.eh_autor && ["ativo", "expirado"].includes(anuncio.status) && (
            <div className="painel mb-3">
              <h2 className="h3">Falar com quem anunciou</h2>
              {anuncio.contato ? (
                <>
                  <p className="mb-2">
                    {anuncio.contato.nome.split(" ")[0]} ({PERFIS[anuncio.autor.perfil].toLowerCase()}
                    {anuncio.autor.verificado && ", verificado"}): <strong>{telefoneBR(anuncio.contato.telefone)}</strong>
                  </p>
                  <a className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer"
                     href={linkWhatsApp(`Olá! Vi seu anúncio no AchaPet (${anuncio.codigo}): ${link}`, anuncio.contato.telefone)}>
                    <i className="bi bi-whatsapp" /> Chamar no WhatsApp
                  </a>
                </>
              ) : (
                <>
                  <p className="mb-2">Para proteger quem anunciou, o telefone só aparece para quem tem conta.</p>
                  <Link className="btn btn-tinta" to={`/entrar?voltar=/a/${anuncio.codigo}`}>Entrar para ver o contato</Link>
                </>
              )}
            </div>
          )}

          <div className="mb-3"><AvisoGolpe /></div>

          {anuncio.eh_autor && (
            <div className="painel">
              <h2 className="h3">Gerenciar anúncio</h2>
              {anuncio.status === "ativo" && !anuncio.expirado && (
                <p className="texto-suave mb-2">Expira em {diasAte(anuncio.expira_em)} dia(s).</p>
              )}
              <div className="d-flex flex-wrap gap-2">
                {["ativo", "expirado"].includes(anuncio.status) && (
                  <>
                    <button className="btn btn-ap" type="button"
                            onClick={() => acao("reencontrado", "Que notícia boa! O anúncio agora mostra que o pet voltou para casa.")}>
                      <i className="bi bi-house-heart" /> Marcar como reencontrado
                    </button>
                    <button className="btn btn-contorno" type="button" onClick={() => acao("renovar", "Anúncio renovado por mais 30 dias.")}>
                      Renovar por 30 dias
                    </button>
                    <Link className="btn btn-contorno" to={`/a/${anuncio.codigo}/editar`}>Editar</Link>
                  </>
                )}
                <button className="btn btn-outline-danger" type="button" onClick={excluir}>Excluir</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-6">
          <h2 className="h3">Região aproximada</h2>
          <MapContainer center={[anuncio.lat_aprox, anuncio.lng_aprox]} zoom={15} scrollWheelZoom={false}
                        style={{ height: 280, borderRadius: 16 }}>
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                       attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            <Circle center={[anuncio.lat_aprox, anuncio.lng_aprox]} radius={300}
                    pathOptions={{ color: "#d97b26", weight: 2, fillColor: "#ffd166", fillOpacity: 0.4 }} />
          </MapContainer>
          <p className="form-text">Por segurança, o mapa mostra uma área de cerca de 300 m, não o ponto exato.</p>
        </div>

        {anuncio.eh_autor && anuncio.status === "ativo" && (
          <div className="col-lg-6">
            <h2 className="h3">Anúncios parecidos por perto</h2>
            <p className="texto-suave">
              {anuncio.tipo === "perdido" ? "Animais encontrados" : "Animais perdidos"} com a mesma espécie, porte e pelo
              menos uma cor em comum, até 5 km.
            </p>
            {correspondencias.length ? (
              <div className="d-flex flex-column gap-2">
                {correspondencias.map((c) => <ItemLista key={c.codigo} anuncio={c} />)}
              </div>
            ) : (
              <Vazio><p className="mb-0">Nenhum anúncio compatível ainda. A gente confere de novo sempre que você abrir esta página.</p></Vazio>
            )}
          </div>
        )}

        {!anuncio.eh_autor && logado && ["ativo", "reencontrado", "expirado"].includes(anuncio.status) && (
          <div className="col-lg-6">
            <details className="painel">
              <summary className="fw-semibold">Denunciar anúncio</summary>
              <form className="mt-3" onSubmit={enviarDenuncia}>
                <div className="mb-2">
                  <label className="form-label" htmlFor="motivo">Motivo</label>
                  <select id="motivo" className="form-select" value={denuncia.motivo}
                          onChange={(e) => setDenuncia({ ...denuncia, motivo: e.target.value })}>
                    {Object.entries(MOTIVOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label" htmlFor="detalhe">Conte o que aconteceu (opcional)</label>
                  <textarea id="detalhe" className="form-control" rows="2" maxLength={500} value={denuncia.detalhe}
                            onChange={(e) => setDenuncia({ ...denuncia, detalhe: e.target.value })} />
                </div>
                <button className="btn btn-outline-danger" type="submit">Enviar denúncia</button>
              </form>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
