/**
 * Sessão do usuário: login pelo Supabase Auth + perfil vindo da nossa API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { api } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (s) => {
    if (!s) {
      setPerfil(null);
      return;
    }
    try {
      setPerfil(await api("/usuarios/eu"));
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSessao(data.session);
      await carregarPerfil(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s);
      // fora do callback para não travar o Supabase Auth
      setTimeout(() => carregarPerfil(s), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [carregarPerfil]);

  const valor = useMemo(
    () => ({
      sessao,
      perfil,
      carregando,
      logado: Boolean(sessao),
      ehModerador: perfil?.papel === "moderador",
      async entrar(email, senha) {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error("E-mail ou senha incorretos.");
      },
      async sair() {
        await supabase.auth.signOut();
      },
      recarregarPerfil: () => carregarPerfil(sessao),
    }),
    [sessao, perfil, carregando, carregarPerfil],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
