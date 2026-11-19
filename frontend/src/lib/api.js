/**
 * Cliente da API Express do AchaPet. Envia o token do Supabase Auth quando há
 * alguém logado e transforma respostas de erro em ErroApi (com erros por campo).
 */
import { supabase } from "./supabase.js";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ErroApi extends Error {
  constructor(status, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes ?? {};
  }
}

export async function api(caminho, { metodo = "GET", corpo } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let resposta;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: {
        ...(corpo !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi(0, "Sem conexão com o servidor. Verifique sua internet.");
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new ErroApi(resposta.status, dados.erro ?? "Algo deu errado.", dados.detalhes);
  return dados;
}
