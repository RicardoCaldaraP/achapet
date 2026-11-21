/**
 * Fotos dos anúncios de demonstração.   Uso: npm run fotos-demo
 *
 * Coloca uma foto em cada anúncio criado pelo seed (os que ainda não têm foto).
 * As fotos são do Wikimedia Commons, com licenças livres (créditos em
 * fotos-demo/CREDITOS.md). Ficam salvas em scripts/fotos-demo/; se faltar alguma,
 * o script baixa do Commons uma vez e guarda na pasta.
 * Cada foto vai para o Storage do Supabase na pasta do autor do anúncio,
 * do mesmo jeito que o site faz ao publicar.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BUCKET_FOTOS } from "../src/lib/supabase.js";

const PASTA = join(dirname(fileURLToPath(import.meta.url)), "fotos-demo");
const COMMONS = "https://thumb.wikimedia.org/wikipedia/commons/thumb";
const LIMITE_BYTES = 1024 * 1024; // mesmo limite do bucket

/** Cada foto é ligada ao anúncio do seed pela descrição (que é única). */
export const FOTOS = [
  { chave: "thor", descricao: "Fugiu durante a queima de fogos.", url: `${COMMONS}/f/f7/Cachorrosalcoba%C3%A7a.JPG/960px-Cachorrosalcoba%C3%A7a.JPG` },
  { chave: "caramelo-itapua", descricao: "Encontrado perto da orla, assustado e sem coleira.", url: `${COMMONS}/d/dd/Cachorro_esperando_na_ado%C3%A7%C3%A3o_3_20240623-DSC03735_02.jpg/960px-Cachorro_esperando_na_ado%C3%A7%C3%A3o_3_20240623-DSC03735_02.jpg` },
  { chave: "mimi", descricao: "Gata castrada, muito medrosa.", url: `${COMMONS}/4/49/Tuxedo_patterned_black_mackerel_tabby_and_white_cat.jpg/960px-Tuxedo_patterned_black_mackerel_tabby_and_white_cat.jpg` },
  { chave: "gata-cinza", descricao: "Gatinha cinza apareceu no prédio.", url: `${COMMONS}/5/58/Gray_Cat.jpg/960px-Gray_Cat.jpg` },
  { chave: "pipoca", descricao: "Poodle idosa, enxerga pouco.", url: "https://upload.wikimedia.org/wikipedia/commons/9/94/Lily_the_white_poodle_%282005%29.jpg" },
  { chave: "labrador-camburi", descricao: "Labrador preto com coleira azul sem plaquinha", url: `${COMMONS}/e/ed/Black_Labrador_retriever_resting_its_head_on_blue_denim.jpg/960px-Black_Labrador_retriever_resting_its_head_on_blue_denim.jpg` },
  { chave: "bob", descricao: "Saiu pelo portão aberto.", url: `${COMMONS}/7/7b/Lab_Black_Called_Amy.JPG/960px-Lab_Black_Called_Amy.JPG` },
  { chave: "calopsita", descricao: "Calopsita pousou na janela do escritório.", url: `${COMMONS}/3/3b/Cockatiel_%28Nymphicus_hollandicus%29_perched_in_a_tree.jpg/960px-Cockatiel_%28Nymphicus_hollandicus%29_perched_in_a_tree.jpg` },
  { chave: "frajola", descricao: "Gato frajola, castrado", url: `${COMMONS}/1/15/Pumiforme.JPG/960px-Pumiforme.JPG` },
  { chave: "cadelinha-roupinha", descricao: "Cadelinha encontrada no terminal, com roupinha.", url: `${COMMONS}/a/a8/Dog_sweater_1.jpg/960px-Dog_sweater_1.jpg` },
  { chave: "luna", descricao: "Luna é tímida", url: `${COMMONS}/5/50/Caramelo_dog_59.jpg/960px-Caramelo_dog_59.jpg` },
];

/** Lê a foto da pasta ou, se ainda não existir, baixa do Commons e salva. */
async function obterFoto({ chave, url }) {
  const arquivo = join(PASTA, `${chave}.jpg`);
  if (existsSync(arquivo)) return readFileSync(arquivo);
  const resposta = await fetch(url, {
    headers: { "User-Agent": "AchaPet/1.0 (projeto academico UVV; fotos de demonstracao)" },
  });
  if (!resposta.ok) throw new Error(`Não consegui baixar ${chave}: HTTP ${resposta.status}`);
  const bytes = Buffer.from(await resposta.arrayBuffer());
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(arquivo, bytes);
  return bytes;
}

export async function adicionarFotosDemo({ prisma, supabase, log = console.log }) {
  let enviadas = 0;
  for (const foto of FOTOS) {
    const anuncio = await prisma.anuncio.findFirst({
      where: { descricao: { startsWith: foto.descricao } },
      include: { fotos: true },
    });
    if (!anuncio) {
      log(`- ${foto.chave}: anúncio não encontrado, pulei.`);
      continue;
    }
    if (anuncio.fotos.length > 0) continue;

    const bytes = await obterFoto(foto);
    if (bytes.length > LIMITE_BYTES) {
      log(`- ${foto.chave}: foto maior que 1 MB, pulei.`);
      continue;
    }
    const caminho = `${anuncio.usuario_id}/demo-${foto.chave}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`Falha ao enviar ${foto.chave}: ${error.message}`);

    await prisma.foto.create({ data: { anuncio_id: anuncio.id, caminho, ordem: 1 } });
    enviadas += 1;
  }
  log(`${enviadas} foto(s) adicionada(s) aos anúncios de demonstração.`);
  return enviadas;
}

// Rodando direto pelo terminal: npm run fotos-demo
const rodandoDireto =
  process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (rodandoDireto) {
  const { criarDependencias } = await import("../src/dependencias.js");
  const deps = criarDependencias();
  try {
    await adicionarFotosDemo(deps);
  } catch (erro) {
    console.error(erro);
    process.exitCode = 1;
  } finally {
    await deps.prisma.$disconnect();
  }
}
