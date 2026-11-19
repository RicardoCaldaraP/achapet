/**
 * Middlewares de autenticação, autorização e validação.
 */
import { ErroApp } from "./erros.js";

/**
 * Lê o token "Authorization: Bearer ..." emitido pelo Supabase Auth, confere com
 * o Supabase e carrega o perfil da tabela usuario em req.usuario.
 * obrigatorio=false deixa passar visitantes (req.usuario fica null).
 */
export function autenticar({ auth, prisma, obrigatorio = true }) {
  return async (req, res, next) => {
    req.usuario = null;
    const cabecalho = req.get("authorization") ?? "";
    const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : null;
    if (token) {
      const identidade = await auth.verificarToken(token);
      if (identidade) {
        req.usuario = await prisma.usuario.findUnique({ where: { id: identidade.id } });
      }
    }
    if (obrigatorio && !req.usuario) {
      return next(new ErroApp(401, "Entre na sua conta para continuar."));
    }
    next();
  };
}

export function exigirModerador(req, res, next) {
  if (req.usuario?.papel !== "moderador") {
    return next(new ErroApp(403, "Apenas moderadores podem acessar esta área."));
  }
  next();
}

/** Valida req[origem] com um schema Zod (ou fábrica de schema) e guarda o resultado em req.dados. */
export function validar(schema, origem = "body") {
  return (req, res, next) => {
    const s = typeof schema === "function" ? schema(req) : schema;
    req.dados = s.parse(req[origem] ?? {});
    next();
  };
}
