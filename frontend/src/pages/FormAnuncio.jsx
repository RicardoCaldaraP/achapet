/**
 * Publicar e editar anúncio (mesmo formulário).
 * React Hook Form + Zod no navegador; a API valida de novo no servidor e os
 * erros que ela devolver aparecem no campo certo.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../lib/api.js";
import { urlFoto } from "../lib/supabase.js";
import { CORES, ESPECIES, PORTES, SEXOS } from "../lib/rotulos.js";
import { anuncioSchema } from "../lib/validacao.js";
import { comprimir, enviarFotos } from "../lib/fotos.js";
import { enderecoPorPonto, listarEstados, listarMunicipios } from "../lib/geo.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useAvisos } from "../contexts/AvisosContext.jsx";
import { Carregando, ErroCampo } from "../components/Comuns.jsx";
import SeletorLocal from "../components/SeletorLocal.jsx";

const hoje = () => new Date().toISOString().slice(0, 10);
const classe = (erro, base = "form-control") => `${base}${erro ? " is-invalid" : ""}`;

export default function FormAnuncio() {
  const { codigo } = useParams();
  const editando = Boolean(codigo);
  const { sessao } = useAuth();
  const avisar = useAvisos();
  const navegar = useNavigate();
  const [carregando, setCarregando] = useState(editando);
  const [fotosAtuais, setFotosAtuais] = useState([]);
  const [fotosNovas, setFotosNovas] = useState([]);
  const [preparandoFotos, setPreparandoFotos] = useState(false);
  const [erroFotos, setErroFotos] = useState(null);
  const [estados, setEstados] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const editados = useRef(new Set());

  const {
    register, handleSubmit, setValue, watch, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(anuncioSchema),
    defaultValues: {
      tipo: undefined, especie: "cachorro", porte: "medio", sexo: "nao_sei", cores: [],
      nome_pet: "", raca: "", descricao: "", detalhe_oculto: "", data_ocorrencia: hoje(),
      latitude: undefined, longitude: undefined, bairro: "", cidade: "", uf: "ES",
    },
  });
  const [latitude, longitude, uf] = watch(["latitude", "longitude", "uf"]);

  useEffect(() => {
    document.title = `${editando ? "Editar" : "Publicar"} anúncio | AchaPet`;
    listarEstados().then(setEstados).catch(() => {});
  }, [editando]);

  // Lista de municípios do IBGE para a UF escolhida (sugestões no campo Cidade).
  useEffect(() => {
    listarMunicipios(uf).then(setMunicipios).catch(() => setMunicipios([]));
  }, [uf]);

  useEffect(() => {
    if (!editando) return;
    api(`/anuncios/${codigo}`)
      .then((a) => {
        if (!a.eh_autor) throw new Error();
        reset({
          tipo: a.tipo, especie: a.especie, porte: a.porte, sexo: a.sexo, cores: a.cor_ids.map(String),
          nome_pet: a.nome_pet ?? "", raca: a.raca ?? "", descricao: a.descricao ?? "",
          detalhe_oculto: a.detalhe_oculto ?? "", data_ocorrencia: a.data_ocorrencia,
          latitude: a.lat, longitude: a.lng, bairro: a.bairro ?? "", cidade: a.cidade ?? "", uf: a.uf ?? "ES",
        });
        ["bairro", "cidade", "uf"].forEach((c) => editados.current.add(c));
        setFotosAtuais(a.fotos);
        setCarregando(false);
      })
      .catch(() => {
        avisar("Você só pode editar os seus anúncios.", "warning");
        navegar("/meus-anuncios");
      });
  }, [codigo, editando, reset, navegar, avisar]);

  function preencherEndereco(end) {
    for (const campo of ["bairro", "cidade", "uf"]) {
      if (end?.[campo] && !editados.current.has(campo)) setValue(campo, end[campo]);
    }
  }

  async function marcarPonto(lat, lng) {
    setValue("latitude", lat, { shouldValidate: true });
    setValue("longitude", lng, { shouldValidate: true });
    preencherEndereco(await enderecoPorPonto(lat, lng));
  }

  async function escolherFotos(evento) {
    setErroFotos(null);
    const arquivos = Array.from(evento.target.files ?? []);
    if (arquivos.length > 3) setErroFotos("Escolha no máximo 3 fotos. Vamos usar as 3 primeiras.");
    setPreparandoFotos(true);
    try {
      setFotosNovas(await Promise.all(arquivos.slice(0, 3).map(comprimir)));
    } catch {
      setErroFotos("Uma das fotos não pôde ser lida. Tente outra imagem.");
    }
    setPreparandoFotos(false);
  }

  async function enviar(dados) {
    try {
      const fotos = fotosNovas.length ? await enviarFotos(fotosNovas, sessao.user.id) : editando ? undefined : [];
      const corpo = { ...dados, cores: dados.cores.map(Number), fotos };
      const anuncio = editando
        ? await api(`/anuncios/${codigo}`, { metodo: "PUT", corpo })
        : await api("/anuncios", { metodo: "POST", corpo });
      avisar(editando ? "Anúncio atualizado." : "Anúncio publicado! Compartilhe o link e imprima o cartaz.");
      navegar(`/a/${anuncio.codigo}`);
    } catch (erro) {
      for (const [campo, mensagem] of Object.entries(erro.detalhes ?? {})) {
        setError(campo.split(".")[0], { message: mensagem });
      }
      avisar(erro.message, "danger");
    }
  }

  if (carregando) return <Carregando />;

  const marcarEditado = (campo) => ({
    onInput: () => editados.current.add(campo),
  });

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <h1 className="mb-1">{editando ? `Editar anúncio ${codigo.toUpperCase()}` : "Publicar anúncio"}</h1>
      <p className="texto-suave mb-4">Quanto mais detalhes, maior a chance de alguém reconhecer o animal.</p>

      <form className="painel" onSubmit={handleSubmit(enviar)} noValidate>
        <fieldset className="mb-4">
          <legend className="h3">O que aconteceu?</legend>
          <div className="escolha-tipo" role="radiogroup">
            {[["perdido", "Perdido", "Meu pet sumiu"], ["encontrado", "Encontrado", "Achei um bichinho na rua"]].map(([v, r, d]) => (
              <div key={v}>
                <input type="radio" id={`tipo-${v}`} value={v} {...register("tipo")} />
                <label htmlFor={`tipo-${v}`} className={v}>{r}<small>{d}</small></label>
              </div>
            ))}
          </div>
          <ErroCampo erro={errors.tipo} />
        </fieldset>

        <fieldset className="mb-4">
          <legend className="h3">Sobre o animal</legend>
          <div className="row">
            <div className="col-12 col-sm-4 mb-3">
              <label className="form-label" htmlFor="especie">Espécie</label>
              <select id="especie" className={classe(errors.especie, "form-select")} {...register("especie")}>
                {Object.entries(ESPECIES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-4 mb-3">
              <label className="form-label" htmlFor="porte">Porte</label>
              <select id="porte" className={classe(errors.porte, "form-select")} {...register("porte")}>
                {Object.entries(PORTES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
            <div className="col-6 col-sm-4 mb-3">
              <label className="form-label" htmlFor="sexo">Sexo</label>
              <select id="sexo" className="form-select" {...register("sexo")}>
                {Object.entries(SEXOS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <span className="form-label d-block">Cores da pelagem</span>
            <ul className="lista-cores">
              {CORES.map(([id, nome]) => (
                <li key={id}>
                  <input type="checkbox" id={`cor-${id}`} value={String(id)} {...register("cores")} />
                  <label htmlFor={`cor-${id}`}>{nome}</label>
                </li>
              ))}
            </ul>
            <ErroCampo erro={errors.cores} />
          </div>
          <div className="row">
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="nome_pet">Nome do animal</label>
              <input id="nome_pet" className={classe(errors.nome_pet)} placeholder="Se souber" maxLength={60} {...register("nome_pet")} />
              <ErroCampo erro={errors.nome_pet} />
            </div>
            <div className="col-sm-6 mb-3">
              <label className="form-label" htmlFor="raca">Raça</label>
              <input id="raca" className={classe(errors.raca)} placeholder="Ex.: SRD, poodle" maxLength={60} {...register("raca")} />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="descricao">Descrição</label>
            <textarea id="descricao" className={classe(errors.descricao)} rows={4} maxLength={1000}
                      placeholder="Coleira, comportamento, marcas no corpo, se atende pelo nome..." {...register("descricao")} />
            <ErroCampo erro={errors.descricao} />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="detalhe_oculto">Detalhe secreto (só você vê)</label>
            <input id="detalhe_oculto" className="form-control" maxLength={200} {...register("detalhe_oculto")} />
            <div className="form-text">Uma marca que só o dono saberia. Use para conferir quem diz ser o tutor.</div>
          </div>
        </fieldset>

        <fieldset className="mb-4">
          <legend className="h3">Quando e onde</legend>
          <div className="mb-3" style={{ maxWidth: 260 }}>
            <label className="form-label" htmlFor="data_ocorrencia">Quando aconteceu?</label>
            <input id="data_ocorrencia" type="date" max={hoje()} className={classe(errors.data_ocorrencia)} {...register("data_ocorrencia")} />
            <ErroCampo erro={errors.data_ocorrencia} />
          </div>
          <p className="form-label mb-2">Onde o animal foi visto pela última vez?</p>
          <SeletorLocal latitude={latitude} longitude={longitude} aoMarcar={marcarPonto} aoEncontrarEndereco={preencherEndereco} />
          <ErroCampo erro={errors.latitude ?? errors.longitude} />
          <div className="row mt-3">
            <div className="col-sm-5 mb-3">
              <label className="form-label" htmlFor="bairro">Bairro</label>
              <input id="bairro" className="form-control" maxLength={80} {...register("bairro")} {...marcarEditado("bairro")} />
            </div>
            <div className="col-sm-5 mb-3">
              <label className="form-label" htmlFor="cidade">Cidade</label>
              <input id="cidade" className="form-control" list="municipios" maxLength={80} {...register("cidade")} {...marcarEditado("cidade")} />
              <datalist id="municipios">{municipios.map((m) => <option key={m} value={m} />)}</datalist>
            </div>
            <div className="col-sm-2 mb-3">
              <label className="form-label" htmlFor="uf">UF</label>
              <select id="uf" className="form-select" {...register("uf")} {...marcarEditado("uf")}>
                {(estados.length ? estados : [{ sigla: "ES" }]).map((e) => <option key={e.sigla} value={e.sigla}>{e.sigla}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="mb-4">
          <legend className="h3">Fotos</legend>
          {editando && fotosAtuais.length > 0 && (
            <>
              <p className="form-text">Fotos atuais (enviar novas substitui todas):</p>
              <div className="previas mb-2">
                {fotosAtuais.map((f, i) => <img key={f} src={urlFoto(f)} alt={`Foto ${i + 1} do anúncio`} />)}
              </div>
            </>
          )}
          <input type="file" className="form-control" accept="image/*" multiple aria-label="Fotos (até 3)" onChange={escolherFotos} />
          <div className="form-text">Até 3 fotos. Elas são reduzidas no seu celular antes do envio (até 1 MB cada).</div>
          {erroFotos && <div className="invalid-feedback">{erroFotos}</div>}
          <div className="previas mt-2">
            {fotosNovas.map((f, i) => <img key={i} src={URL.createObjectURL(f)} alt={`Prévia da foto ${i + 1}`} />)}
          </div>
        </fieldset>

        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-ap btn-lg" type="submit" disabled={isSubmitting || preparandoFotos}>
            {preparandoFotos ? "Preparando fotos..." : isSubmitting ? "Enviando..." : editando ? "Salvar alterações" : "Publicar anúncio"}
          </button>
          <button className="btn btn-contorno btn-lg" type="button" onClick={() => navegar(-1)}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
