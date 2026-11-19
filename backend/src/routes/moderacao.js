/** Painel de moderação (somente usuários com papel = 'moderador'). */
import { Router } from "express";
import { ErroApp } from "../erros.js";
import { decisaoSchema } from "../schemas.js";
import { exigirModerador, validar } from "../middlewares.js";

export function rotasModeracao({ servicos, exigirLogin }) {
  const r = Router();
  const { moderacao, anuncios } = servicos;
  r.use(exigirLogin, exigirModerador);

  r.get("/denuncias", async (req, res) => {
    res.json(await moderacao.pendentes());
  });

  r.post("/anuncios/:codigo/decisao", validar(decisaoSchema), async (req, res) => {
    const anuncio = await anuncios.buscarPorCodigo(req.params.codigo);
    if (!anuncio) throw new ErroApp(404, "Anúncio não encontrado.");
    await moderacao.decidir(anuncio, req.usuario, req.dados.decisao);
    req.log?.warn({ codigo: anuncio.codigo, decisao: req.dados.decisao }, "decisão de moderação");
    res.json({ mensagem: req.dados.decisao === "remover" ? "Anúncio removido." : "Denúncias arquivadas." });
  });

  return r;
}
