CREATE EXTENSION IF NOT EXISTS postgis;

CREATE OR REPLACE FUNCTION gerar_codigo(tamanho INTEGER DEFAULT 6)
RETURNS VARCHAR
LANGUAGE sql
VOLATILE
AS $$
    SELECT string_agg(substr('23456789ABCDEFGHJKMNPQRSTUVWXYZ',
                             1 + floor(random() * 31)::INTEGER, 1), '')::VARCHAR
      FROM generate_series(1, tamanho);
$$;

CREATE TABLE usuario (
    id                UUID           NOT NULL DEFAULT gen_random_uuid(),
    nome              VARCHAR(100)   NOT NULL,
    email             VARCHAR(254)   NOT NULL,
    senha_hash        VARCHAR(255),
    telefone          VARCHAR(13)    NOT NULL,
    perfil            VARCHAR(10)    NOT NULL DEFAULT 'pessoa',
    verificado        BOOLEAN        NOT NULL DEFAULT FALSE,
    papel             VARCHAR(10)    NOT NULL DEFAULT 'usuario',
    aceite_termos_em  TIMESTAMPTZ    NOT NULL,
    criado_em         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    atualizado_em     TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT usuario_pk          PRIMARY KEY (id),
    CONSTRAINT usuario_telefone_ck CHECK (telefone ~ '^55[1-9]{2}[0-9]{8,9}$'),
    CONSTRAINT usuario_perfil_ck   CHECK (perfil IN ('pessoa', 'protetor', 'ong')),
    CONSTRAINT usuario_papel_ck    CHECK (papel IN ('usuario', 'moderador'))
);

CREATE UNIQUE INDEX usuario_email_uk ON usuario (lower(email));

CREATE TABLE cor (
    id    SMALLINT      GENERATED ALWAYS AS IDENTITY,
    nome  VARCHAR(20)   NOT NULL,
    CONSTRAINT cor_pk      PRIMARY KEY (id),
    CONSTRAINT cor_nome_uk UNIQUE (nome)
);

CREATE TABLE anuncio (
    id               BIGINT         GENERATED ALWAYS AS IDENTITY,
    codigo           VARCHAR(8)     NOT NULL DEFAULT gerar_codigo(),
    usuario_id       UUID           NOT NULL,
    tipo             VARCHAR(10)    NOT NULL,
    status           VARCHAR(12)    NOT NULL DEFAULT 'ativo',
    especie          VARCHAR(10)    NOT NULL,
    porte            VARCHAR(7)     NOT NULL,
    sexo             VARCHAR(7)     NOT NULL DEFAULT 'nao_sei',
    nome_pet         VARCHAR(60),
    raca             VARCHAR(60),
    descricao        VARCHAR(1000),
    detalhe_oculto   VARCHAR(200),
    data_ocorrencia  DATE           NOT NULL,
    localizacao      GEOGRAPHY(POINT, 4326) NOT NULL,
    bairro           VARCHAR(80),
    cidade           VARCHAR(80),
    uf               CHAR(2),
    expira_em        TIMESTAMPTZ    NOT NULL DEFAULT now() + INTERVAL '30 days',
    reencontrado_em  TIMESTAMPTZ,
    criado_em        TIMESTAMPTZ    NOT NULL DEFAULT now(),
    atualizado_em    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT anuncio_pk             PRIMARY KEY (id),
    CONSTRAINT anuncio_codigo_uk      UNIQUE (codigo),
    CONSTRAINT anuncio_usuario_fk     FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT anuncio_tipo_ck        CHECK (tipo IN ('perdido', 'encontrado')),
    CONSTRAINT anuncio_status_ck      CHECK (status IN ('ativo', 'oculto', 'reencontrado', 'expirado', 'removido')),
    CONSTRAINT anuncio_especie_ck     CHECK (especie IN ('cachorro', 'gato', 'outro')),
    CONSTRAINT anuncio_porte_ck       CHECK (porte IN ('pequeno', 'medio', 'grande')),
    CONSTRAINT anuncio_sexo_ck        CHECK (sexo IN ('macho', 'femea', 'nao_sei')),
    CONSTRAINT anuncio_uf_ck          CHECK (uf ~ '^[A-Z]{2}$'),
    CONSTRAINT anuncio_reencontro_ck  CHECK (status <> 'reencontrado' OR reencontrado_em IS NOT NULL)
);

CREATE INDEX anuncio_localizacao_gix ON anuncio USING GIST (localizacao);
CREATE INDEX anuncio_filtros_ix      ON anuncio (status, tipo, especie, data_ocorrencia DESC);
CREATE INDEX anuncio_usuario_ix      ON anuncio (usuario_id);
CREATE INDEX anuncio_expira_ix       ON anuncio (expira_em) WHERE status = 'ativo';

CREATE TABLE foto (
    id          BIGINT         GENERATED ALWAYS AS IDENTITY,
    anuncio_id  BIGINT         NOT NULL,
    caminho     VARCHAR(300)   NOT NULL,
    ordem       SMALLINT       NOT NULL DEFAULT 1,
    criado_em   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT foto_pk          PRIMARY KEY (id),
    CONSTRAINT foto_anuncio_fk  FOREIGN KEY (anuncio_id)
        REFERENCES anuncio (id) ON DELETE CASCADE,
    CONSTRAINT foto_ordem_ck    CHECK (ordem BETWEEN 1 AND 3),
    CONSTRAINT foto_ordem_uk    UNIQUE (anuncio_id, ordem)
);

CREATE TABLE anuncio_cor (
    anuncio_id  BIGINT     NOT NULL,
    cor_id      SMALLINT   NOT NULL,
    CONSTRAINT anuncio_cor_pk          PRIMARY KEY (anuncio_id, cor_id),
    CONSTRAINT anuncio_cor_anuncio_fk  FOREIGN KEY (anuncio_id)
        REFERENCES anuncio (id) ON DELETE CASCADE,
    CONSTRAINT anuncio_cor_cor_fk      FOREIGN KEY (cor_id)
        REFERENCES cor (id)
);

CREATE INDEX anuncio_cor_cor_ix ON anuncio_cor (cor_id);

CREATE TABLE denuncia (
    id              BIGINT         GENERATED ALWAYS AS IDENTITY,
    anuncio_id      BIGINT         NOT NULL,
    denunciante_id  UUID,
    motivo          VARCHAR(20)    NOT NULL,
    detalhe         VARCHAR(500),
    situacao        VARCHAR(12)    NOT NULL DEFAULT 'pendente',
    moderador_id    UUID,
    analisada_em    TIMESTAMPTZ,
    criado_em       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT denuncia_pk              PRIMARY KEY (id),
    CONSTRAINT denuncia_anuncio_fk      FOREIGN KEY (anuncio_id)
        REFERENCES anuncio (id) ON DELETE CASCADE,
    CONSTRAINT denuncia_denunciante_fk  FOREIGN KEY (denunciante_id)
        REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT denuncia_moderador_fk    FOREIGN KEY (moderador_id)
        REFERENCES usuario (id) ON DELETE SET NULL,
    CONSTRAINT denuncia_motivo_ck       CHECK (motivo IN ('golpe', 'informacao_falsa', 'conteudo_improprio', 'duplicado', 'outro')),
    CONSTRAINT denuncia_situacao_ck     CHECK (situacao IN ('pendente', 'procedente', 'improcedente')),
    CONSTRAINT denuncia_unica_uk        UNIQUE (anuncio_id, denunciante_id)
);

CREATE TABLE avistamento (
    id           BIGINT         GENERATED ALWAYS AS IDENTITY,
    anuncio_id   BIGINT         NOT NULL,
    usuario_id   UUID,
    localizacao  GEOGRAPHY(POINT, 4326) NOT NULL,
    visto_em     TIMESTAMPTZ    NOT NULL,
    comentario   VARCHAR(300),
    criado_em    TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT avistamento_pk          PRIMARY KEY (id),
    CONSTRAINT avistamento_anuncio_fk  FOREIGN KEY (anuncio_id)
        REFERENCES anuncio (id) ON DELETE CASCADE,
    CONSTRAINT avistamento_usuario_fk  FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE SET NULL
);

CREATE INDEX avistamento_anuncio_ix ON avistamento (anuncio_id, visto_em DESC);

CREATE TABLE alerta_regiao (
    id          BIGINT         GENERATED ALWAYS AS IDENTITY,
    usuario_id  UUID           NOT NULL,
    centro      GEOGRAPHY(POINT, 4326) NOT NULL,
    raio_m      INTEGER        NOT NULL DEFAULT 3000,
    especie     VARCHAR(10),
    tipo        VARCHAR(10),
    ativo       BOOLEAN        NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT alerta_regiao_pk          PRIMARY KEY (id),
    CONSTRAINT alerta_regiao_usuario_fk  FOREIGN KEY (usuario_id)
        REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT alerta_regiao_raio_ck     CHECK (raio_m BETWEEN 500 AND 20000),
    CONSTRAINT alerta_regiao_especie_ck  CHECK (especie IN ('cachorro', 'gato', 'outro')),
    CONSTRAINT alerta_regiao_tipo_ck     CHECK (tipo IN ('perdido', 'encontrado'))
);

CREATE INDEX alerta_regiao_centro_gix  ON alerta_regiao USING GIST (centro) WHERE ativo;
CREATE INDEX alerta_regiao_usuario_ix  ON alerta_regiao (usuario_id);

CREATE OR REPLACE FUNCTION tg_usuario_atualizado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER usuario_atualizado
    BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION tg_usuario_atualizado();

CREATE OR REPLACE FUNCTION tg_anuncio_atualizado()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em := now();
    IF NEW.status = 'reencontrado' AND OLD.status <> 'reencontrado' THEN
        NEW.reencontrado_em := coalesce(NEW.reencontrado_em, now());
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER anuncio_atualizado
    BEFORE UPDATE ON anuncio
    FOR EACH ROW EXECUTE FUNCTION tg_anuncio_atualizado();

CREATE OR REPLACE FUNCTION tg_denuncia_ocultar()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (SELECT count(*)
          FROM denuncia
         WHERE anuncio_id = NEW.anuncio_id
           AND situacao = 'pendente') >= 3 THEN
        UPDATE anuncio
           SET status = 'oculto'
         WHERE id = NEW.anuncio_id
           AND status = 'ativo';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER denuncia_ocultar
    AFTER INSERT ON denuncia
    FOR EACH ROW EXECUTE FUNCTION tg_denuncia_ocultar();

CREATE OR REPLACE VIEW vw_anuncio_publico AS
SELECT a.codigo,
       a.tipo,
       a.status,
       a.especie,
       a.porte,
       a.sexo,
       a.nome_pet,
       a.raca,
       a.descricao,
       a.data_ocorrencia,
       a.bairro,
       a.cidade,
       a.uf,
       ST_Y(ST_SnapToGrid(a.localizacao::geometry, 0.003)) AS lat_aprox,
       ST_X(ST_SnapToGrid(a.localizacao::geometry, 0.003)) AS lng_aprox,
       (SELECT string_agg(c.nome, ', ' ORDER BY c.nome)
          FROM anuncio_cor ac
          JOIN cor c ON c.id = ac.cor_id
         WHERE ac.anuncio_id = a.id) AS cores,
       (SELECT f.caminho
          FROM foto f
         WHERE f.anuncio_id = a.id
         ORDER BY f.ordem
         LIMIT 1) AS foto_capa,
       a.criado_em,
       a.expira_em
  FROM anuncio a
 WHERE a.status IN ('ativo', 'reencontrado', 'expirado');

CREATE OR REPLACE FUNCTION buscar_anuncios(
    p_lat      DOUBLE PRECISION,
    p_lng      DOUBLE PRECISION,
    p_raio_m   INTEGER DEFAULT 5000,
    p_tipo     VARCHAR DEFAULT NULL,
    p_especie  VARCHAR DEFAULT NULL,
    p_desde    DATE    DEFAULT NULL
)
RETURNS TABLE (
    codigo           VARCHAR,
    tipo             VARCHAR,
    especie          VARCHAR,
    porte            VARCHAR,
    nome_pet         VARCHAR,
    data_ocorrencia  DATE,
    bairro           VARCHAR,
    lat_aprox        DOUBLE PRECISION,
    lng_aprox        DOUBLE PRECISION,
    distancia_m      INTEGER,
    cores            TEXT,
    foto_capa        VARCHAR
)
LANGUAGE sql
STABLE
AS $$
    SELECT v.codigo,
           v.tipo,
           v.especie,
           v.porte,
           v.nome_pet,
           v.data_ocorrencia,
           v.bairro,
           v.lat_aprox,
           v.lng_aprox,
           round(ST_Distance(a.localizacao, ponto.g))::INTEGER,
           v.cores,
           v.foto_capa
      FROM anuncio a
      JOIN vw_anuncio_publico v ON v.codigo = a.codigo
     CROSS JOIN (SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g) AS ponto
     WHERE a.status = 'ativo'
       AND a.expira_em > now()
       AND ST_DWithin(a.localizacao, ponto.g, p_raio_m)
       AND (p_tipo IS NULL OR a.tipo = p_tipo)
       AND (p_especie IS NULL OR a.especie = p_especie)
       AND (p_desde IS NULL OR a.data_ocorrencia >= p_desde)
     ORDER BY a.criado_em DESC
     LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION sugerir_correspondencias(
    p_codigo  VARCHAR,
    p_raio_m  INTEGER DEFAULT 5000
)
RETURNS TABLE (
    codigo           VARCHAR,
    tipo             VARCHAR,
    data_ocorrencia  DATE,
    bairro           VARCHAR,
    distancia_m      INTEGER,
    cores_em_comum   INTEGER
)
LANGUAGE sql
STABLE
AS $$
    SELECT *
      FROM (SELECT b.codigo,
                   b.tipo,
                   b.data_ocorrencia,
                   b.bairro,
                   round(ST_Distance(a.localizacao, b.localizacao))::INTEGER AS distancia_m,
                   (SELECT count(*)::INTEGER
                      FROM anuncio_cor ca
                      JOIN anuncio_cor cb ON cb.cor_id = ca.cor_id
                     WHERE ca.anuncio_id = a.id
                       AND cb.anuncio_id = b.id) AS cores_em_comum
              FROM anuncio a
              JOIN anuncio b
                ON b.tipo <> a.tipo
               AND b.especie = a.especie
               AND b.porte = a.porte
               AND (b.sexo = a.sexo OR 'nao_sei' IN (a.sexo, b.sexo))
               AND b.status = 'ativo'
               AND b.expira_em > now()
               AND ST_DWithin(a.localizacao, b.localizacao, p_raio_m)
             WHERE a.codigo = upper(p_codigo)
               AND CASE WHEN a.tipo = 'perdido'
                        THEN b.data_ocorrencia BETWEEN a.data_ocorrencia - 1 AND a.data_ocorrencia + 30
                        ELSE a.data_ocorrencia BETWEEN b.data_ocorrencia - 1 AND b.data_ocorrencia + 30
                   END
           ) AS candidatos
     WHERE cores_em_comum > 0
     ORDER BY cores_em_comum DESC, distancia_m
     LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION expirar_anuncios()
RETURNS INTEGER
LANGUAGE sql
AS $$
    WITH expirados AS (
        UPDATE anuncio
           SET status = 'expirado'
         WHERE status = 'ativo'
           AND expira_em < now()
        RETURNING 1
    )
    SELECT count(*)::INTEGER FROM expirados;
$$;

INSERT INTO cor (nome) VALUES
    ('preto'), ('branco'), ('cinza'), ('marrom'), ('caramelo'),
    ('creme'), ('dourado'), ('laranja'), ('rajado'), ('malhado');
