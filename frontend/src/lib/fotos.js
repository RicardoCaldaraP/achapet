/**
 * Fotos: comprime no navegador (até 1 MB, 1280 px, JPEG) e envia direto para o
 * Supabase Storage, na pasta do usuário logado. A API recebe só os caminhos.
 */
import imageCompression from "browser-image-compression";
import { BUCKET_FOTOS, supabase } from "./supabase.js";

export async function comprimir(arquivo) {
  const reduzida = await imageCompression(arquivo, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  return new File([reduzida], "foto.jpg", { type: "image/jpeg" });
}

export async function enviarFotos(arquivos, usuarioId) {
  const caminhos = [];
  for (const arquivo of arquivos) {
    const caminho = `${usuarioId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS)
      .upload(caminho, arquivo, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error("Não foi possível enviar as fotos. Tente novamente.");
    caminhos.push(caminho);
  }
  return caminhos;
}
