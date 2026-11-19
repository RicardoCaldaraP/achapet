/**
 * Validação dos formulários no navegador (React Hook Form + Zod).
 * É uma primeira barreira para dar resposta rápida ao usuário; a API valida
 * tudo de novo no servidor com as mesmas regras.
 */
import { z } from "zod";

const DDDS = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99]);

export function telefoneValido(valor) {
  let d = String(valor ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  if (!DDDS.has(Number(d.slice(0, 2)))) return false;
  return d.length === 10 || d[2] === "9";
}

const telefone = z.string().refine(telefoneValido, "Informe um telefone válido com DDD, ex.: (27) 99999-1234.");

export const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome.").max(100),
    email: z.email("E-mail inválido."),
    telefone,
    perfil: z.enum(["pessoa", "protetor", "ong"]),
    senha: z
      .string()
      .min(8, "A senha precisa ter 8 caracteres ou mais, com letras e números.")
      .regex(/[A-Za-z]/, "A senha precisa ter letras.")
      .regex(/\d/, "A senha precisa ter números."),
    confirmar_senha: z.string(),
    aceite_termos: z.literal(true, { error: "É preciso aceitar os termos de uso." }),
  })
  .refine((d) => d.senha === d.confirmar_senha, {
    path: ["confirmar_senha"],
    message: "As senhas não conferem.",
  });

export const loginSchema = z.object({
  email: z.email("E-mail inválido."),
  senha: z.string().min(1, "Informe sua senha."),
});

export const perfilSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(100),
  telefone,
  perfil: z.enum(["pessoa", "protetor", "ong"]),
});

const hoje = () => new Date().toISOString().slice(0, 10);

export const anuncioSchema = z.object({
  tipo: z.enum(["perdido", "encontrado"], { error: "Diga se o animal foi perdido ou encontrado." }),
  especie: z.enum(["cachorro", "gato", "outro"]),
  porte: z.enum(["pequeno", "medio", "grande"]),
  sexo: z.enum(["macho", "femea", "nao_sei"]),
  cores: z.array(z.coerce.number()).min(1, "Marque pelo menos uma cor (ela é usada para achar anúncios parecidos)."),
  nome_pet: z.string().max(60).optional(),
  raca: z.string().max(60).optional(),
  descricao: z.string().max(1000, "Use no máximo 1000 caracteres.").optional(),
  detalhe_oculto: z.string().max(200).optional(),
  data_ocorrencia: z
    .string()
    .min(1, "Informe a data.")
    .refine((d) => d <= hoje(), "A data não pode estar no futuro."),
  latitude: z.number({ error: "Marque no mapa onde o animal foi visto pela última vez." }),
  longitude: z.number({ error: "Marque no mapa onde o animal foi visto pela última vez." }),
  bairro: z.string().max(80).optional(),
  cidade: z.string().max(80).optional(),
  uf: z.string().optional(),
});
