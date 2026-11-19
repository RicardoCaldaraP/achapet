-- =====================================================================
-- Segurança da API REST do Supabase (PostgREST) e do Storage
-- =====================================================================
-- O Supabase publica as tabelas do schema "public" numa API REST acessível
-- com a chave publicável. Regras adotadas:
--   1. Row Level Security ligado em todas as tabelas, sem políticas:
--      ninguém lê ou escreve tabelas direto pela API pública.
--      Leituras e escritas passam pelo backend (Express + Prisma).
--   2. Exceção proposital: a função buscar_anuncios() pode ser chamada pela
--      API REST (supabase.rpc) pelo mural. Ela roda como dona (SECURITY DEFINER)
--      e só devolve as colunas públicas da vw_anuncio_publico, com o local
--      arredondado (~300 m), sem telefone nem detalhe oculto.
--   3. Fotos: cada usuário logado só envia arquivos para a pasta com o seu id.
-- =====================================================================

ALTER TABLE usuario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cor           ENABLE ROW LEVEL SECURITY;
ALTER TABLE anuncio       ENABLE ROW LEVEL SECURITY;
ALTER TABLE foto          ENABLE ROW LEVEL SECURITY;
ALTER TABLE anuncio_cor   ENABLE ROW LEVEL SECURITY;
ALTER TABLE denuncia      ENABLE ROW LEVEL SECURITY;
ALTER TABLE avistamento   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerta_regiao ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION buscar_anuncios(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, VARCHAR, VARCHAR, DATE)
    SECURITY DEFINER SET search_path = public, extensions;

DO $$
BEGIN
    -- Os papéis anon/authenticated só existem no Supabase.
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON vw_anuncio_publico FROM anon, authenticated;
        REVOKE EXECUTE ON FUNCTION sugerir_correspondencias(VARCHAR, INTEGER) FROM PUBLIC, anon, authenticated;
        REVOKE EXECUTE ON FUNCTION expirar_anuncios() FROM PUBLIC, anon, authenticated;
        REVOKE EXECUTE ON FUNCTION gerar_codigo(INTEGER) FROM PUBLIC, anon, authenticated;
        REVOKE EXECUTE ON FUNCTION buscar_anuncios(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, VARCHAR, VARCHAR, DATE) FROM PUBLIC;
        GRANT EXECUTE ON FUNCTION buscar_anuncios(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, VARCHAR, VARCHAR, DATE) TO anon, authenticated;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('fotos', 'fotos', true, 1048576, ARRAY['image/jpeg'])
        ON CONFLICT (id) DO UPDATE SET file_size_limit = 1048576, allowed_mime_types = ARRAY['image/jpeg'];

        CREATE POLICY "fotos_envio_na_propria_pasta" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = 'fotos' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;
