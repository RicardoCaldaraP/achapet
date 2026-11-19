/** Rotas dos anúncios: publicar, ver, editar, gerenciar, correspondências e denúncia. */
import { Router } from "express";
import { ErroApp } from "../erros.js";
import { anuncioSchema, denunciaSchema } from "../schemas.js";
import { validar } from "../middlewares.js";

export function rotasAnuncios({ servicos, exigirLogin, loginOpcional }) {
  const r = Router();
  const { anuncios, moderacao } = servicos;

  /** Carrega o anúncio do :codigo em req.anuncio (404 se não existe). */
  async function carregar(req, res, next) {
    req.anuncio = await anuncios.buscarPorCodigo(req.params.codigo);
    if (!req.anuncio) return next(new ErroApp(404, "Anúncio não encontrado."));
    next();
  }

  /** Só o autor pode alterar o anúncio. */
  function somenteAutor(req, res, next) {
    if (req.anuncio.usuario_id !== req.usuario.id) {
      return next(new ErroApp(403, "Só quem publicou pode alterar este anúncio."));
    }
    next();
  }

  const schemaDoUsuario = (req) => anuncioSchema(req.usuario.id);

  // ---------- públicas ----------
  r.get("/recentes", async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 6, 24);
    res.json(await anuncios.recentes(limite));
  });

  r.get("/estatisticas", async (req, res) => {
    res.json(await anuncios.estatisticas());
  });

  // ---------- do usuário logado ----------
  r.get("/meus", exigirLogin, async (req, res) => {
    res.json(await anuncios.listarDoUsuario(req.usuario.id));
  });

  r.post("/", exigirLogin, validar(schemaDoUsuario), async (req, res) => {
    const anuncio = await anuncios.criar(req.usuario, req.dados);
    req.log?.info({ codigo: anuncio.codigo, tipo: anuncio.tipo }, "anúncio publicado");
    res.status(201).json(anuncios.apresentar(anuncio, req.usuario));
  });

  // ---------- por código ----------
  r.get("/:codigo", loginOpcional, carregar, (req, res, next) => {
    const { anuncio, usuario } = req;
    const visivel = ["ativo", "reencontrado", "expirado"].includes(anuncio.status);
    const autorOuModerador = usuario && (usuario.id === anuncio.usuario_id || usuario.papel === "moderador");
    if (!visivel && !autorOuModerador) return next(new ErroApp(404, "Anúncio não encontrado."));
    res.json(anuncios.apresentar(anuncio, usuario));
  });

  r.put("/:codigo", exigirLogin, carregar, somenteAutor, validar(schemaDoUsuario), async (req, res) => {
    const anuncio = await anuncios.atualizar(req.anuncio, req.dados);
    res.json(anuncios.apresentar(anuncio, req.usuario));
  });

  r.post("/:codigo/renovar", exigirLogin, carregar, somenteAutor, async (req, res) => {
    await anuncios.renovar(req.anuncio);
    res.json(anuncios.apresentar(await anuncios.buscarPorCodigo(req.anuncio.codigo), req.usuario));
  });

  r.post("/:codigo/reencontrado", exigirLogin, carregar, somenteAutor, async (req, res) => {
    await anuncios.marcarReencontrado(req.anuncio);
    req.log?.info({ codigo: req.anuncio.codigo }, "pet reencontrado");
    res.json(anuncios.apresentar(await anuncios.buscarPorCodigo(req.anuncio.codigo), req.usuario));
  });

  r.delete("/:codigo", exigirLogin, carregar, somenteAutor, async (req, res) => {
    await anuncios.excluir(req.anuncio);
    res.status(204).end();
  });

  r.get("/:codigo/correspondencias", exigirLogin, carregar, somenteAutor, async (req, res) => {
    if (req.anuncio.status !== "ativo") return res.json([]);
    res.json(await anuncios.correspondencias(req.anuncio.codigo));
  });

  r.post("/:codigo/denuncias", exigirLogin, carregar, validar(denunciaSchema), async (req, res) => {
    const status = await moderacao.denunciar(req.anuncio, req.usuario, req.dados);
    req.log?.warn({ codigo: req.anuncio.codigo, motivo: req.dados.motivo, status }, "denúncia");
    res.status(201).json({ mensagem: "Denúncia enviada. A moderação vai analisar.", status });
  });

  return r;
}
