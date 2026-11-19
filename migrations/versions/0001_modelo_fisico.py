"""Modelo físico inicial do AchaPet (PostgreSQL + PostGIS).

Executa o script migrations/sql/0001_modelo_fisico.sql, que cria as 8 tabelas,
os índices espaciais, a view pública, as funções de busca/correspondência,
os triggers e a lista de cores. Manter o script SQL versionado aqui garante que
regras do banco (triggers e funções) também façam parte do histórico.

Revision ID: 0001
Revises:
Create Date: 2026-11-19
"""

from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SCRIPT = Path(__file__).resolve().parents[1] / "sql" / "0001_modelo_fisico.sql"


def upgrade():
    # exec_driver_sql envia o script sem interpretar ":" como parâmetro
    # (o SQL usa casts como ::INTEGER e blocos $$ ... $$).
    op.get_bind().exec_driver_sql(SCRIPT.read_text(encoding="utf-8"))


def downgrade():
    op.get_bind().exec_driver_sql("""
        DROP FUNCTION IF EXISTS expirar_anuncios();
        DROP FUNCTION IF EXISTS sugerir_correspondencias(VARCHAR, INTEGER);
        DROP FUNCTION IF EXISTS buscar_anuncios(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER,
                                                VARCHAR, VARCHAR, DATE);
        DROP VIEW IF EXISTS vw_anuncio_publico;
        DROP TABLE IF EXISTS alerta_regiao, avistamento, denuncia, anuncio_cor, foto,
                             anuncio, cor, usuario CASCADE;
        DROP FUNCTION IF EXISTS tg_denuncia_ocultar();
        DROP FUNCTION IF EXISTS tg_anuncio_atualizado();
        DROP FUNCTION IF EXISTS tg_usuario_atualizado();
        DROP FUNCTION IF EXISTS gerar_codigo(INTEGER);
    """)
