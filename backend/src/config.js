/**
 * Configuração da API, lida das variáveis de ambiente (.env) e validada com Zod.
 * Se faltar algo obrigatório, a aplicação nem sobe e diz o que está faltando.
 */
import "dotenv/config";
import { z } from "zod";

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.string().default("info"),

  DATABASE_URL: z
    .string({ error: "Defina DATABASE_URL (URI do pooler do Supabase) no arquivo .env" })
    .startsWith("postgres", "DATABASE_URL deve ser uma URI do PostgreSQL"),
  // Schema do Postgres usado pela API. Os testes usam um schema separado.
  DB_SCHEMA: z.string().default("public"),

  SUPABASE_URL: z.url("Defina SUPABASE_URL no arquivo .env").optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  NOMINATIM_USER_AGENT: z.string().default("AchaPet/1.0 (projeto academico UVV)"),

  // Endereço público do site, usado nos links dos e-mails. Na Netlify, se não for
  // definido, usa a variável URL que a própria Netlify cria.
  SITE_URL: z.string().default("http://localhost:5173"),

  // E-mail dos alertas (SMTP). Opcional: sem isso os alertas só vão para o log.
  SMTP_HOST: z.string().optional(),
  SMTP_PORTA: z.coerce.number().default(587),
  SMTP_USUARIO: z.string().optional(),
  SMTP_SENHA: z.string().optional(),
  EMAIL_REMETENTE: z.string().optional(),

  // Regras de negócio do MVP
  LIMITE_ANUNCIOS_POR_DIA: z.coerce.number().default(5),
  DIAS_VALIDADE_ANUNCIO: z.coerce.number().default(30),
  RAIO_CORRESPONDENCIA_M: z.coerce.number().default(5000),
});

export function carregarConfig(env = process.env) {
  const resultado = esquema.safeParse({ ...env, SITE_URL: env.SITE_URL || env.URL || undefined });
  if (!resultado.success) {
    const problemas = resultado.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Configuração inválida:\n${problemas.join("\n")}`);
  }
  return resultado.data;
}
