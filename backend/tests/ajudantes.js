/**
 * Ferramentas dos testes: cria a aplicação com dependências falsas do Supabase
 * (login e storage) e um banco real no schema "testes".
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { carregarConfig } from "../src/config.js";
import { criarLogger } from "../src/lib/logger.js";
import { criarPrisma } from "../src/lib/prisma.js";

const config = carregarConfig({
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
  DB_SCHEMA: "testes",
});
export const prisma = criarPrisma({ url: config.DATABASE_URL, schema: "testes" });

/** Supabase Auth falso: o token é "token-<id do usuário>". */
export const authFalso = {
  logins: new Map(),
  async verificarToken(token) {
    const id = token.replace("token-", "");
    return this.logins.has(id) ? { id } : null;
  },
  async criarUsuario({ email }) {
    const id = randomUUID();
    this.logins.set(id, email);
    return id;
  },
  async excluirUsuario(id) {
    this.logins.delete(id);
  },
};

/** Storage falso: guarda os caminhos removidos para conferir nos testes. */
export const storageFalso = {
  removidos: [],
  async removerFotos(caminhos) {
    this.removidos.push(...caminhos);
  },
};

export const geoFalso = {
  async enderecoPorPonto() {
    return { bairro: "Praia da Costa", cidade: "Vila Velha", uf: "ES" };
  },
};

/** E-mail falso: guarda as mensagens "enviadas" para conferir nos testes. */
export const emailFalso = {
  configurado: true,
  enviados: [],
  async enviar(mensagem) {
    this.enviados.push(mensagem);
    return true;
  },
};

export const app = createApp({
  config,
  prisma,
  auth: authFalso,
  storage: storageFalso,
  logger: criarLogger({ ambiente: "test" }),
  geo: geoFalso,
  email: emailFalso,
});

/** Cadastra um usuário pela API e devolve { id, token, ... }. */
export async function criarUsuario(request, extra = {}) {
  const sufixo = randomUUID().slice(0, 8);
  const dados = {
    nome: "Ana Tutora",
    email: `ana-${sufixo}@teste.com`,
    telefone: "(27) 99999-1111",
    perfil: "pessoa",
    senha: "senha1234",
    aceite_termos: true,
    ...extra,
  };
  const resposta = await request.post("/api/usuarios").send(dados);
  if (resposta.status !== 201) throw new Error(JSON.stringify(resposta.body));
  return { ...resposta.body, token: `token-${resposta.body.id}`, auth: { Authorization: `Bearer token-${resposta.body.id}` } };
}

export async function tornarModerador(usuario) {
  await prisma.usuario.update({ where: { id: usuario.id }, data: { papel: "moderador" } });
}

export function dadosAnuncio(usuario, extra = {}) {
  return {
    tipo: "perdido",
    especie: "cachorro",
    porte: "medio",
    sexo: "macho",
    cores: [1, 4], // preto, marrom
    nome_pet: "Thor",
    raca: "SRD",
    descricao: "Coleira vermelha",
    detalhe_oculto: "Mancha na orelha",
    data_ocorrencia: new Date().toISOString().slice(0, 10),
    latitude: -20.3328,
    longitude: -40.2876,
    bairro: "Praia da Costa",
    cidade: "Vila Velha",
    uf: "es",
    fotos: [`${usuario.id}/foto1.jpg`],
    ...extra,
  };
}

export async function criarAnuncio(request, usuario, extra = {}) {
  const r = await request.post("/api/anuncios").set(usuario.auth).send(dadosAnuncio(usuario, extra));
  if (r.status !== 201) throw new Error(JSON.stringify(r.body));
  return r.body;
}

/** Banco limpo entre os testes (a lista de cores fica). */
export function limparBancoAposCadaTeste() {
  afterEach(async () => {
    await prisma.$executeRawUnsafe(
      "TRUNCATE usuario, anuncio, foto, anuncio_cor, denuncia, avistamento, alerta_regiao RESTART IDENTITY CASCADE",
    );
    storageFalso.removidos.length = 0;
    emailFalso.enviados.length = 0;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
}
