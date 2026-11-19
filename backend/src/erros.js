/**
 * Erros da aplicação e o middleware que transforma qualquer erro em uma
 * resposta JSON padronizada: { erro: "mensagem", detalhes?: {...} }.
 */
import { ZodError } from "zod";

export class ErroApp extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

/** Converte os erros do Zod em { campo: "mensagem" } para o formulário mostrar. */
export function errosPorCampo(erroZod) {
  const campos = {};
  for (const issue of erroZod.issues) {
    const campo = issue.path.join(".") || "_geral";
    campos[campo] ??= issue.message;
  }
  return campos;
}

export function naoEncontrado(req, res) {
  res.status(404).json({ erro: "Rota não encontrada." });
}

// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ erro: "Dados inválidos.", detalhes: errosPorCampo(err) });
  }
  if (err instanceof ErroApp) {
    return res.status(err.status).json({ erro: err.message, detalhes: err.detalhes });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ erro: "JSON inválido." });
  }
  if (err?.code === "P2002") {
    return res.status(409).json({ erro: "Registro duplicado." });
  }
  req.log?.error({ err }, "erro não tratado");
  return res.status(500).json({ erro: "Erro interno. Tente novamente em instantes." });
}
