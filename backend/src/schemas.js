/**
 * Validação dos dados recebidos pela API (Zod).
 * Os valores aceitos espelham os CHECKs do modelo físico do banco.
 */
import { z } from "zod";

export const TIPOS = ["perdido", "encontrado"];
export const ESPECIES = ["cachorro", "gato", "outro"];
export const PORTES = ["pequeno", "medio", "grande"];
export const SEXOS = ["macho", "femea", "nao_sei"];
export const PERFIS = ["pessoa", "protetor", "ong"];
export const MOTIVOS = ["golpe", "informacao_falsa", "conteudo_improprio", "duplicado", "outro"];

const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** "(27) 99999-1234" -> "5527999991234" (formato do banco) ou null se inválido. */
export function normalizarTelefone(valor) {
  let d = String(valor ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (!DDDS.has(Number(d.slice(0, 2)))) return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return `55${d}`;
}

const textoOpcional = (max) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const telefone = z
  .string({ error: "Informe um telefone." })
  .transform((v, ctx) => {
    const n = normalizarTelefone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Informe um telefone válido com DDD." });
      return z.NEVER;
    }
    return n;
  });

// ---------------- usuários ----------------
export const cadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(100),
  email: z.email("E-mail inválido.").max(254).transform((v) => v.toLowerCase()),
  telefone,
  perfil: z.enum(PERFIS).default("pessoa"),
  senha: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .regex(/[A-Za-z]/, "A senha precisa ter letras.")
    .regex(/\d/, "A senha precisa ter números."),
  aceite_termos: z.literal(true, { error: "É preciso aceitar os termos de uso." }),
});

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(100),
  telefone,
  perfil: z.enum(PERFIS),
});

// ---------------- anúncios ----------------
const hoje = () => new Date(new Date().toISOString().slice(0, 10));

export function anuncioSchema(usuarioId) {
  return z.object({
    tipo: z.enum(TIPOS, { error: "Diga se o animal foi perdido ou encontrado." }),
    especie: z.enum(ESPECIES, { error: "Escolha a espécie." }),
    porte: z.enum(PORTES, { error: "Escolha o porte." }),
    sexo: z.enum(SEXOS).default("nao_sei"),
    cores: z
      .array(z.coerce.number().int().positive())
      .min(1, "Marque pelo menos uma cor.")
      .max(10),
    nome_pet: textoOpcional(60),
    raca: textoOpcional(60),
    descricao: textoOpcional(1000),
    detalhe_oculto: textoOpcional(200),
    data_ocorrencia: z.coerce
      .date({ error: "Informe a data." })
      .refine((d) => d <= hoje(), "A data não pode estar no futuro.")
      .refine(
        (d) => d >= new Date(hoje().getTime() - 365 * 86400000),
        "A data deve ser de no máximo um ano atrás.",
      ),
    latitude: z.coerce
      .number({ error: "Marque o local no mapa." })
      .min(-34, "O local precisa estar no Brasil.")
      .max(5.5, "O local precisa estar no Brasil."),
    longitude: z.coerce
      .number({ error: "Marque o local no mapa." })
      .min(-74, "O local precisa estar no Brasil.")
      .max(-34, "O local precisa estar no Brasil."),
    bairro: textoOpcional(80),
    cidade: textoOpcional(80),
    uf: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, "UF inválida.")
      .transform((v) => v.toUpperCase())
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    // Caminhos no Storage enviados pelo navegador: só da pasta do próprio usuário.
    fotos: z
      .array(
        z
          .string()
          .regex(
            new RegExp(`^${usuarioId}/[A-Za-z0-9_-]+\\.jpg$`),
            "Foto inválida.",
          ),
      )
      .max(3, "Envie no máximo 3 fotos.")
      .optional(),
  });
}

export const denunciaSchema = z.object({
  motivo: z.enum(MOTIVOS, { error: "Escolha um motivo." }),
  detalhe: textoOpcional(500),
});

export const decisaoSchema = z.object({
  decisao: z.enum(["remover", "manter"], { error: "Decisão inválida." }),
});

export const coordenadasSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});
