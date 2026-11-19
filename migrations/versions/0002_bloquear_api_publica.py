"""Bloqueia o acesso direto às tabelas pela API pública do Supabase.

O Supabase publica o schema "public" numa API REST (PostgREST) acessível com a
chave anônima. O AchaPet não usa essa API: todo acesso passa pelo Flask, que se
conecta como dono do banco. Por isso:
- ativamos Row Level Security sem nenhuma política (ninguém de fora lê/escreve);
- tiramos dos papéis "anon" e "authenticated" o acesso à view e às funções.
Em um PostgreSQL comum (sem esses papéis) a parte de permissões é ignorada.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-19
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TABELAS = ["usuario", "cor", "anuncio", "foto", "anuncio_cor", "denuncia", "avistamento",
           "alerta_regiao"]


def upgrade():
    for tabela in TABELAS:
        op.execute(f"ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY")
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON vw_anuncio_publico FROM anon, authenticated;
                REVOKE EXECUTE ON FUNCTION buscar_anuncios(DOUBLE PRECISION, DOUBLE PRECISION,
                    INTEGER, VARCHAR, VARCHAR, DATE) FROM PUBLIC, anon, authenticated;
                REVOKE EXECUTE ON FUNCTION sugerir_correspondencias(VARCHAR, INTEGER)
                    FROM PUBLIC, anon, authenticated;
                REVOKE EXECUTE ON FUNCTION expirar_anuncios() FROM PUBLIC, anon, authenticated;
                REVOKE EXECUTE ON FUNCTION gerar_codigo(INTEGER) FROM PUBLIC, anon, authenticated;
            END IF;
        END $$;
    """)


def downgrade():
    for tabela in TABELAS:
        op.execute(f"ALTER TABLE {tabela} DISABLE ROW LEVEL SECURITY")
