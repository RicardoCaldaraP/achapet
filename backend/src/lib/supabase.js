/**
 * Integração com o Supabase pelo lado do servidor (chave secret).
 *
 * Expõe dois serviços pequenos, que a aplicação recebe por injeção de dependência
 * (ver createApp). Nos testes eles são trocados por versões falsas.
 *   - auth:    verificar o token de login, criar e excluir usuários do Supabase Auth
 *   - storage: apagar fotos do bucket
 */
import { createClient } from "@supabase/supabase-js";
import { ErroApp } from "../erros.js";

export const BUCKET_FOTOS = "fotos";

export function criarClienteSupabase({ url, chaveSecreta }) {
  if (!url || !chaveSecreta) {
    throw new Error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env");
  }
  return createClient(url, chaveSecreta, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function criarServicoAuth(supabase) {
  return {
    /** Devolve { id, email } do dono do token, ou null se o token for inválido/expirado. */
    async verificarToken(token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return null;
      return { id: data.user.id, email: data.user.email };
    },

    /** Cria o login (e-mail e senha) no Supabase Auth, já confirmado. */
    async criarUsuario({ email, senha, nome }) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (error) {
        if (error.status === 422 || /registered|exists/i.test(error.message)) {
          throw new ErroApp(409, "Já existe uma conta com este e-mail.");
        }
        throw new ErroApp(502, "Não foi possível criar o login agora. Tente novamente.");
      }
      return data.user.id;
    },

    async excluirUsuario(id) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw new ErroApp(502, "Não foi possível excluir o login.");
    },
  };
}

export function criarServicoStorage(supabase) {
  return {
    async removerFotos(caminhos) {
      if (!caminhos.length) return;
      await supabase.storage.from(BUCKET_FOTOS).remove(caminhos);
    },
  };
}
