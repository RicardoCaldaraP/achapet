/** Rótulos exibidos na tela para os valores guardados no banco. */
export const TIPOS = { perdido: "Perdido", encontrado: "Encontrado" };
export const ESPECIES = { cachorro: "Cachorro", gato: "Gato", outro: "Outro" };
export const PORTES = { pequeno: "Pequeno", medio: "Médio", grande: "Grande" };
export const SEXOS = { macho: "Macho", femea: "Fêmea", nao_sei: "Não sei" };
export const PERFIS = { pessoa: "Pessoa", protetor: "Protetor(a) independente", ong: "ONG" };
export const STATUS = {
  ativo: "Ativo",
  oculto: "Em análise",
  reencontrado: "Reencontrado",
  expirado: "Expirado",
  removido: "Removido",
};
export const MOTIVOS = {
  golpe: "Golpe / pedido de dinheiro",
  informacao_falsa: "Informação falsa",
  conteudo_improprio: "Conteúdo impróprio",
  duplicado: "Anúncio duplicado",
  outro: "Outro motivo",
};
// Mesma ordem e ids da tabela "cor" do banco.
export const CORES = [
  [1, "preto"], [2, "branco"], [3, "cinza"], [4, "marrom"], [5, "caramelo"],
  [6, "creme"], [7, "dourado"], [8, "laranja"], [9, "rajado"], [10, "malhado"],
];
export const CENTRO_PADRAO = [-20.3155, -40.3128]; // Vitória (ES), onde o piloto acontece

export function tituloAnuncio(a) {
  const base = `${ESPECIES[a.especie]} ${TIPOS[a.tipo].toLowerCase()}`;
  return a.nome_pet ? `${base}: ${a.nome_pet}` : base;
}
