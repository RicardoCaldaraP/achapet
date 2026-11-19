/** Formatação de datas, distâncias, telefone e links do WhatsApp. */
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const paraData = (v) => (typeof v === "string" ? new Date(`${v.slice(0, 10)}T12:00:00`) : v);

export function dataBR(valor) {
  if (!valor) return "";
  const d = paraData(valor);
  return `${String(d.getDate()).padStart(2, "0")} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function tempoRelativo(valor) {
  if (!valor) return "";
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const dias = Math.round((hoje - paraData(valor)) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  return `há ${dias} dias`;
}

export function diasAte(valor) {
  return Math.max(0, Math.ceil((new Date(valor) - new Date()) / 86400000));
}

export function distancia(metros) {
  if (metros == null) return "";
  return metros < 1000 ? `${metros} m` : `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

/** 5527999991234 -> (27) 99999-1234 */
export function telefoneBR(t) {
  const ddd = t.slice(2, 4);
  const n = t.slice(4);
  return n.length === 9 ? `(${ddd}) ${n.slice(0, 5)}-${n.slice(5)}` : `(${ddd}) ${n.slice(0, 4)}-${n.slice(4)}`;
}

export function linkWhatsApp(texto, telefone) {
  return `https://wa.me/${telefone ?? ""}?text=${encodeURIComponent(texto)}`;
}

export function localTexto(a) {
  const partes = [a.bairro, a.cidade].filter(Boolean).join(", ");
  return a.uf && partes ? `${partes} - ${a.uf}` : partes;
}
