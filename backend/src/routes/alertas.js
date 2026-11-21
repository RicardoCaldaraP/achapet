/** Rotas dos alertas por região (todas exigem login e só mexem nos próprios alertas). */
import { Router } from "express";
import { alertaAtivoSchema, alertaSchema } from "../schemas.js";
import { validar } from "../middlewares.js";
import { ErroApp } from "../erros.js";

export function rotasAlertas({ servicos, exigirLogin }) {
  const r = Router();
  const { alertas } = servicos;

  r.use(exigirLogin);

  /** :id precisa ser um número; senão, 404. */
  r.param("id", (req, res, next, id) => (/^\d+$/.test(id) ? next() : next(new ErroApp(404, "Alerta não encontrado."))));

  r.get("/", async (req, res) => {
    res.json(await alertas.listar(req.usuario.id));
  });

  r.post("/", validar(alertaSchema), async (req, res) => {
    const alerta = await alertas.criar(req.usuario.id, req.dados);
    req.log?.info({ alerta: alerta.id.toString() }, "alerta criado");
    res.status(201).json(alerta);
  });

  r.patch("/:id", validar(alertaAtivoSchema), async (req, res) => {
    res.json(await alertas.definirAtivo(req.usuario.id, req.params.id, req.dados.ativo));
  });

  r.delete("/:id", async (req, res) => {
    await alertas.excluir(req.usuario.id, req.params.id);
    res.status(204).end();
  });

  return r;
}
