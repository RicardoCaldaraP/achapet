/**
 * Dados de demonstração na Grande Vitória (ES).   Uso: npm run seed
 *
 * Cria 5 contas (login no Supabase Auth + perfil) e 11 anúncios espalhados por
 * Vitória, Vila Velha, Serra e Cariacica, incluindo pares que se correspondem,
 * um caso já reencontrado e uma denúncia para a moderação.
 * Rodar de novo não duplica: se já houver anúncios, o script para.
 */
import { criarDependencias } from "../src/dependencias.js";
import { createApp } from "../src/app.js";

const SENHA = process.env.SEED_SENHA || "achapet123";

const USUARIOS = {
  ricardo: { nome: "Ricardo Caldara", email: "ricardo@achapet.dev", telefone: "27999990001", perfil: "pessoa", moderador: true },
  ana: { nome: "Ana Clara Schmidt", email: "ana@achapet.dev", telefone: "27999990002", perfil: "pessoa" },
  bernardo: { nome: "Bernardo Proti", email: "bernardo@achapet.dev", telefone: "27999990003", perfil: "protetor" },
  ong: { nome: "ONG Patas Capixabas", email: "ong@achapet.dev", telefone: "27999990004", perfil: "ong", verificado: true },
  marina: { nome: "Marina Lopes", email: "marina@achapet.dev", telefone: "27999990005", perfil: "pessoa" },
};

// cores: 1 preto, 2 branco, 3 cinza, 4 marrom, 5 caramelo, 6 creme, 7 dourado, 9 rajado
const ANUNCIOS = [
  ["marina", "perdido", "cachorro", "medio", "macho", "Thor", "SRD", [2, 5], 2, -20.3328, -40.2876, "Praia da Costa", "Vila Velha", "Fugiu durante a queima de fogos. Coleira vermelha, atende pelo nome e é muito dócil."],
  ["ong", "encontrado", "cachorro", "medio", "macho", null, "SRD", [5], 1, -20.3405, -40.2902, "Itapuã", "Vila Velha", "Encontrado perto da orla, assustado e sem coleira. Está seguro no nosso lar temporário."],
  ["ana", "perdido", "gato", "pequeno", "femea", "Mimi", null, [3, 9], 4, -20.2832, -40.2938, "Jardim da Penha", "Vitória", "Gata castrada, muito medrosa. Pode estar escondida em garagens da rua."],
  ["bernardo", "encontrado", "gato", "pequeno", "nao_sei", null, null, [3], 2, -20.2878, -40.2985, "Jardim da Penha", "Vitória", "Gatinha cinza apareceu no prédio. Parece ser de casa, está bem cuidada."],
  ["marina", "perdido", "cachorro", "pequeno", "femea", "Pipoca", "Poodle", [2], 6, -20.2955, -40.2952, "Praia do Canto", "Vitória", "Poodle idosa, enxerga pouco. Precisa de remédio para o coração."],
  ["ong", "encontrado", "cachorro", "grande", "macho", null, "Labrador", [1], 3, -20.2617, -40.2679, "Jardim Camburi", "Vitória", "Labrador preto com coleira azul sem plaquinha, perto da praça. Muito brincalhão."],
  ["ana", "perdido", "cachorro", "grande", "macho", "Bob", "Labrador", [1], 5, -20.258, -40.271, "Jardim Camburi", "Vitória", "Saiu pelo portão aberto. Coleira azul, castrado, tem uma cicatriz na pata traseira."],
  ["bernardo", "encontrado", "outro", "pequeno", "nao_sei", null, "Calopsita", [3, 7], 1, -20.3191, -40.3381, "Centro", "Vitória", "Calopsita pousou na janela do escritório. Fala algumas palavras."],
  ["marina", "perdido", "gato", "medio", "macho", "Frajola", null, [1, 2], 9, -20.1992, -40.2531, "Laranjeiras", "Serra", "Gato frajola, castrado, com coleira laranja com guizo."],
  ["ong", "encontrado", "cachorro", "pequeno", "femea", null, "SRD", [4, 6], 0, -20.3331, -40.3872, "Campo Grande", "Cariacica", "Cadelinha encontrada no terminal, com roupinha. Alguém deve estar procurando."],
  ["ana", "perdido", "cachorro", "medio", "femea", "Luna", "Vira-lata", [5], 12, -20.307, -40.317, "Bento Ferreira", "Vitória", "Luna é tímida, não corra atrás dela."],
];

const diasAtras = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

async function main() {
  const deps = criarDependencias();
  const { prisma } = deps;
  const { anuncios, usuarios, moderacao } = createApp(deps).locals.servicos;

  if ((await prisma.anuncio.count()) > 0) {
    console.log("O banco já tem anúncios. Nada a fazer.");
    return prisma.$disconnect();
  }

  const contas = {};
  for (const [chave, u] of Object.entries(USUARIOS)) {
    const existente = await prisma.usuario.findFirst({ where: { email: u.email } });
    contas[chave] =
      existente ??
      (await usuarios.cadastrar({ nome: u.nome, email: u.email, telefone: `55${u.telefone}`, perfil: u.perfil, senha: SENHA }));
    await prisma.usuario.update({
      where: { id: contas[chave].id },
      data: { papel: u.moderador ? "moderador" : "usuario", verificado: Boolean(u.verificado) },
    });
  }

  const criados = [];
  for (const [autor, tipo, especie, porte, sexo, nome, raca, cores, dias, lat, lng, bairro, cidade, descricao] of ANUNCIOS) {
    criados.push(
      await anuncios.criar(contas[autor], {
        tipo, especie, porte, sexo, cores, nome_pet: nome, raca, descricao, detalhe_oculto: null,
        data_ocorrencia: diasAtras(dias), latitude: lat, longitude: lng, bairro, cidade, uf: "ES", fotos: [],
      }),
    );
  }

  await anuncios.marcarReencontrado(criados.at(-1)); // Luna voltou para casa
  await moderacao.denunciar(criados[7], contas.marina, {
    motivo: "duplicado",
    detalhe: "Acho que já vi este anúncio em outro lugar.",
  });

  console.log(`${Object.keys(contas).length} contas e ${criados.length} anúncios criados. Senha: ${SENHA}`);
  console.log("Moderador: ricardo@achapet.dev");
  await prisma.$disconnect();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
