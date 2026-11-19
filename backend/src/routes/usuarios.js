/** Rotas de conta: cadastro, perfil e exclusão (LGPD). */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { cadastroSchema, perfilSchema } from "../schemas.js";
import { validar } from "../middlewares.js";

export function rotasUsuarios({ servicos, exigirLogin, semLimiteNosTestes }) {
  const r = Router();
  const { usuarios } = servicos;

  // Limita tentativas de cadastro por IP (evita criação de contas em massa).
  const limiteCadastro = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    skip: semLimiteNosTestes,
    message: { erro: "Muitas tentativas de cadastro. Tente de novo em alguns minutos." },
  });

  r.post("/", limiteCadastro, validar(cadastroSchema), async (req, res) => {
    const usuario = await usuarios.cadastrar(req.dados);
    req.log?.info({ usuario: usuario.id }, "novo cadastro");
    res.status(201).json(usuarios.apresentar(usuario));
  });

  r.get("/eu", exigirLogin, (req, res) => {
    res.json(usuarios.apresentar(req.usuario));
  });

  r.patch("/eu", exigirLogin, validar(perfilSchema), async (req, res) => {
    const usuario = await usuarios.atualizar(req.usuario.id, req.dados);
    res.json(usuarios.apresentar(usuario));
  });

  r.delete("/eu", exigirLogin, async (req, res) => {
    await usuarios.excluir(req.usuario.id);
    req.log?.warn({ usuario: req.usuario.id }, "conta excluída a pedido do titular");
    res.status(204).end();
  });

  return r;
}
