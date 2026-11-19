/**
 * Serviços públicos de localização chamados pelo navegador:
 *  - BrasilAPI (CEP com coordenadas) e ViaCEP (reserva);
 *  - API de localidades do IBGE (estados e municípios para o formulário).
 * O bairro a partir do ponto no mapa vem da nossa API (Nominatim com cache).
 */
import { api } from "./api.js";

const IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades";
const cacheMunicipios = new Map();

export async function listarEstados() {
  const r = await fetch(`${IBGE}/estados?orderBy=nome`);
  const estados = await r.json();
  return estados.map((e) => ({ sigla: e.sigla, nome: e.nome }));
}

export async function listarMunicipios(uf) {
  if (!uf) return [];
  if (!cacheMunicipios.has(uf)) {
    const r = await fetch(`${IBGE}/estados/${uf}/municipios?orderBy=nome`);
    cacheMunicipios.set(uf, (await r.json()).map((m) => m.nome));
  }
  return cacheMunicipios.get(uf);
}

export async function buscarCep(cep) {
  const digitos = String(cep).replace(/\D/g, "");
  if (digitos.length !== 8) throw new Error("Digite um CEP com 8 números.");

  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${digitos}`);
    if (r.ok) {
      const d = await r.json();
      const c = d.location?.coordinates ?? {};
      return {
        bairro: d.neighborhood, cidade: d.city, uf: d.state,
        lat: c.latitude ? Number(c.latitude) : null, lng: c.longitude ? Number(c.longitude) : null,
      };
    }
  } catch {
    /* tenta o ViaCEP */
  }
  const r = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  const d = await r.json();
  if (d.erro) throw new Error("CEP não encontrado.");
  return { bairro: d.bairro, cidade: d.localidade, uf: d.uf, lat: null, lng: null };
}

export async function enderecoPorPonto(lat, lng) {
  try {
    return await api(`/geo/endereco?lat=${lat}&lng=${lng}`);
  } catch {
    return {};
  }
}
