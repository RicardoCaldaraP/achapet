/**
 * Geocodificação reversa com o Nominatim (OpenStreetMap): bairro, cidade e UF de um ponto.
 *
 * A política de uso do Nominatim exige no máximo 1 requisição por segundo e um
 * User-Agent identificado. Por isso as chamadas passam por uma fila com intervalo
 * mínimo e as respostas ficam em cache (pontos a ~100 m reaproveitam a mesma resposta).
 */

const SIGLAS_UF = {
  Acre: "AC", Alagoas: "AL", Amapá: "AP", Amazonas: "AM", Bahia: "BA", Ceará: "CE",
  "Distrito Federal": "DF", "Espírito Santo": "ES", Goiás: "GO", Maranhão: "MA",
  "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", Pará: "PA",
  Paraíba: "PB", Paraná: "PR", Pernambuco: "PE", Piauí: "PI", "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN", "Rio Grande do Sul": "RS", Rondônia: "RO", Roraima: "RR",
  "Santa Catarina": "SC", "São Paulo": "SP", Sergipe: "SE", Tocantins: "TO",
};

export function criarServicoGeo({ userAgent, fetchFn = fetch, intervaloMs = 1000, logger } = {}) {
  const cache = new Map();
  let fila = Promise.resolve();
  let ultima = 0;

  function aguardarVez() {
    const vez = fila.then(async () => {
      const espera = ultima + intervaloMs - Date.now();
      if (espera > 0) await new Promise((r) => setTimeout(r, espera));
      ultima = Date.now();
    });
    fila = vez.catch(() => {});
    return vez;
  }

  async function enderecoPorPonto(lat, lng) {
    const chave = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (cache.has(chave)) return cache.get(chave);

    await aguardarVez();
    try {
      const url = new URL("https://nominatim.openstreetmap.org/reverse");
      url.search = new URLSearchParams({
        lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "16",
        addressdetails: "1", "accept-language": "pt-BR",
      });
      const resposta = await fetchFn(url, { headers: { "User-Agent": userAgent } });
      if (!resposta.ok) return null;
      const dados = await resposta.json();
      const e = dados.address ?? {};
      const endereco = {
        bairro: e.suburb ?? e.neighbourhood ?? e.quarter ?? null,
        cidade: e.city ?? e.town ?? e.municipality ?? null,
        uf: SIGLAS_UF[e.state] ?? null,
      };
      cache.set(chave, endereco);
      return endereco;
    } catch (erro) {
      logger?.warn({ erro: erro.message }, "Nominatim indisponível");
      return null;
    }
  }

  return { enderecoPorPonto };
}
