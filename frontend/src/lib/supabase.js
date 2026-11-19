/**
 * Cliente do Supabase no navegador (chave PUBLICÁVEL).
 * Usado para: login por e-mail (Auth), upload das fotos (Storage) e a busca do
 * mural pela API REST (função buscar_anuncios via RPC).
 */
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const CHAVE = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL ?? "http://localhost", CHAVE ?? "chave-ausente", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const BUCKET_FOTOS = "fotos";

/** URL pública de uma foto guardada no Storage. */
export function urlFoto(caminho) {
  return caminho ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_FOTOS}/${caminho}` : null;
}
