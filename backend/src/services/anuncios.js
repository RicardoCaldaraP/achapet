/**
 * Regras de negócio dos anúncios.
 *
 * O CRUD usa o Prisma. Onde entra o PostGIS (gravar o ponto, ler coordenadas,
 * cruzar anúncios) usamos SQL parametrizado ($queryRaw com template), que o
 * Prisma converte em parâmetros ($1, $2...) e evita SQL injection.
 */
import { ErroApp } from "../erros.js";

const INCLUIR = {
  usuario: true,
  fotos: { orderBy: { ordem: "asc" } },
  cores: { include: { cor: true }, orderBy: { cor: { nome: "asc" } } },
};

const dataISO = (d) => (d ? d.toISOString().slice(0, 10) : null);

export function criarServicoAnuncios({ prisma, storage, geo, config }) {
  async function coordenadas(id) {
    const [c] = await prisma.$queryRaw`
      SELECT ST_Y(localizacao::geometry) AS lat,
             ST_X(localizacao::geometry) AS lng,
             ST_Y(ST_SnapToGrid(localizacao::geometry, 0.003)) AS lat_aprox,
             ST_X(ST_SnapToGrid(localizacao::geometry, 0.003)) AS lng_aprox
        FROM anuncio WHERE id = ${id}`;
    return c;
  }

  async function buscarPorCodigo(codigo) {
    const anuncio = await prisma.anuncio.findUnique({
      where: { codigo: String(codigo).toUpperCase() },
      include: INCLUIR,
    });
    if (!anuncio) return null;
    return { ...anuncio, coords: await coordenadas(anuncio.id) };
  }

  /** Dados que qualquer pessoa pode ver. Telefone e detalhe oculto só sob condição. */
  function apresentar(anuncio, usuario) {
    const ehAutor = usuario?.id === anuncio.usuario_id;
    const podeVerContato =
      Boolean(usuario) && !ehAutor && ["ativo", "expirado"].includes(anuncio.status);
    return {
      codigo: anuncio.codigo,
      tipo: anuncio.tipo,
      status: anuncio.status,
      expirado: anuncio.status === "expirado" || (anuncio.status === "ativo" && anuncio.expira_em < new Date()),
      especie: anuncio.especie,
      porte: anuncio.porte,
      sexo: anuncio.sexo,
      nome_pet: anuncio.nome_pet,
      raca: anuncio.raca,
      descricao: anuncio.descricao,
      data_ocorrencia: dataISO(anuncio.data_ocorrencia),
      bairro: anuncio.bairro,
      cidade: anuncio.cidade,
      uf: anuncio.uf,
      cores: anuncio.cores.map((c) => c.cor.nome),
      fotos: anuncio.fotos.map((f) => f.caminho),
      lat_aprox: anuncio.coords?.lat_aprox,
      lng_aprox: anuncio.coords?.lng_aprox,
      criado_em: anuncio.criado_em,
      expira_em: anuncio.expira_em,
      reencontrado_em: anuncio.reencontrado_em,
      autor: {
        primeiro_nome: anuncio.usuario.nome.split(" ")[0],
        perfil: anuncio.usuario.perfil,
        verificado: anuncio.usuario.verificado,
      },
      eh_autor: ehAutor,
      contato: podeVerContato
        ? { nome: anuncio.usuario.nome, telefone: anuncio.usuario.telefone }
        : null,
      // Só para o autor: dados para editar o anúncio.
      ...(ehAutor && {
        detalhe_oculto: anuncio.detalhe_oculto,
        lat: anuncio.coords?.lat,
        lng: anuncio.coords?.lng,
        cor_ids: anuncio.cores.map((c) => c.cor_id),
      }),
    };
  }

  function resumo(anuncio) {
    return {
      codigo: anuncio.codigo,
      tipo: anuncio.tipo,
      status: anuncio.status,
      expirado: anuncio.status === "expirado" || (anuncio.status === "ativo" && anuncio.expira_em < new Date()),
      especie: anuncio.especie,
      porte: anuncio.porte,
      nome_pet: anuncio.nome_pet,
      bairro: anuncio.bairro,
      cidade: anuncio.cidade,
      data_ocorrencia: dataISO(anuncio.data_ocorrencia),
      cores: anuncio.cores.map((c) => c.cor.nome),
      foto_capa: anuncio.fotos[0]?.caminho ?? null,
      criado_em: anuncio.criado_em,
      expira_em: anuncio.expira_em,
    };
  }

  async function completarEndereco(dados) {
    if (dados.bairro && dados.cidade) return dados;
    const endereco = await geo.enderecoPorPonto(dados.latitude, dados.longitude);
    if (!endereco) return dados;
    return {
      ...dados,
      bairro: dados.bairro ?? endereco.bairro,
      cidade: dados.cidade ?? endereco.cidade,
      uf: dados.uf ?? endereco.uf,
    };
  }

  async function validarCores(ids) {
    const total = await prisma.cor.count({ where: { id: { in: ids } } });
    if (total !== new Set(ids).size) {
      throw new ErroApp(400, "Dados inválidos.", { cores: "Cor inválida." });
    }
  }

  async function anunciosNasUltimas24h(usuarioId) {
    return prisma.anuncio.count({
      where: { usuario_id: usuarioId, criado_em: { gte: new Date(Date.now() - 86400000) } },
    });
  }

  async function criar(usuario, entrada) {
    const limite = config.LIMITE_ANUNCIOS_POR_DIA;
    if ((await anunciosNasUltimas24h(usuario.id)) >= limite) {
      throw new ErroApp(429, `Você já publicou ${limite} anúncios nas últimas 24 horas. Tente amanhã.`);
    }
    await validarCores(entrada.cores);
    const d = await completarEndereco(entrada);

    const codigo = await prisma.$transaction(async (tx) => {
      // A coluna GEOGRAPHY é gravada com SQL do PostGIS; o resto vem do banco
      // (código curto, datas de criação e de expiração).
      const [novo] = await tx.$queryRaw`
        INSERT INTO anuncio (usuario_id, tipo, especie, porte, sexo, nome_pet, raca, descricao,
                             detalhe_oculto, data_ocorrencia, localizacao, bairro, cidade, uf)
        VALUES (${usuario.id}::uuid, ${d.tipo}, ${d.especie}, ${d.porte}, ${d.sexo}, ${d.nome_pet},
                ${d.raca}, ${d.descricao}, ${d.detalhe_oculto}, ${d.data_ocorrencia}::date,
                ST_SetSRID(ST_MakePoint(${d.longitude}, ${d.latitude}), 4326)::geography,
                ${d.bairro}, ${d.cidade}, ${d.uf})
        RETURNING id, codigo`;
      await tx.anuncioCor.createMany({
        data: d.cores.map((cor_id) => ({ anuncio_id: novo.id, cor_id })),
      });
      if (d.fotos?.length) {
        await tx.foto.createMany({
          data: d.fotos.map((caminho, i) => ({ anuncio_id: novo.id, caminho, ordem: i + 1 })),
        });
      }
      return novo.codigo;
    });
    return buscarPorCodigo(codigo);
  }

  async function atualizar(anuncio, entrada) {
    await validarCores(entrada.cores);
    const d = await completarEndereco(entrada);
    const fotosAntigas = anuncio.fotos.map((f) => f.caminho);
    const trocarFotos = Array.isArray(d.fotos) && d.fotos.length > 0;

    await prisma.$transaction(async (tx) => {
      await tx.anuncio.update({
        where: { id: anuncio.id },
        data: {
          tipo: d.tipo, especie: d.especie, porte: d.porte, sexo: d.sexo,
          nome_pet: d.nome_pet, raca: d.raca, descricao: d.descricao,
          detalhe_oculto: d.detalhe_oculto, data_ocorrencia: d.data_ocorrencia,
          bairro: d.bairro, cidade: d.cidade, uf: d.uf,
        },
      });
      await tx.$executeRaw`
        UPDATE anuncio
           SET localizacao = ST_SetSRID(ST_MakePoint(${d.longitude}, ${d.latitude}), 4326)::geography
         WHERE id = ${anuncio.id}`;
      await tx.anuncioCor.deleteMany({ where: { anuncio_id: anuncio.id } });
      await tx.anuncioCor.createMany({
        data: d.cores.map((cor_id) => ({ anuncio_id: anuncio.id, cor_id })),
      });
      if (trocarFotos) {
        await tx.foto.deleteMany({ where: { anuncio_id: anuncio.id } });
        await tx.foto.createMany({
          data: d.fotos.map((caminho, i) => ({ anuncio_id: anuncio.id, caminho, ordem: i + 1 })),
        });
      }
    });
    if (trocarFotos) {
      await storage.removerFotos(fotosAntigas.filter((c) => !d.fotos.includes(c)));
    }
    return buscarPorCodigo(anuncio.codigo);
  }

  async function renovar(anuncio) {
    if (!["ativo", "expirado"].includes(anuncio.status)) {
      throw new ErroApp(409, "Só anúncios ativos ou expirados podem ser renovados.");
    }
    const dias = config.DIAS_VALIDADE_ANUNCIO;
    await prisma.anuncio.update({
      where: { id: anuncio.id },
      data: { status: "ativo", expira_em: new Date(Date.now() + dias * 86400000) },
    });
  }

  async function marcarReencontrado(anuncio) {
    if (anuncio.status === "reencontrado") return;
    if (!["ativo", "expirado"].includes(anuncio.status)) {
      throw new ErroApp(409, "Este anúncio não pode ser marcado como reencontrado.");
    }
    await prisma.anuncio.update({
      where: { id: anuncio.id },
      data: { status: "reencontrado", reencontrado_em: new Date() },
    });
  }

  async function excluir(anuncio) {
    await prisma.anuncio.delete({ where: { id: anuncio.id } }); // fotos e cores saem em cascata
    await storage.removerFotos(anuncio.fotos.map((f) => f.caminho));
  }

  async function listarDoUsuario(usuarioId) {
    const lista = await prisma.anuncio.findMany({
      where: { usuario_id: usuarioId, status: { not: "removido" } },
      include: INCLUIR,
      orderBy: { criado_em: "desc" },
    });
    return lista.map(resumo);
  }

  async function recentes(limite = 6) {
    const lista = await prisma.anuncio.findMany({
      where: { status: "ativo", expira_em: { gt: new Date() } },
      include: INCLUIR,
      orderBy: { criado_em: "desc" },
      take: limite,
    });
    return lista.map(resumo);
  }

  /** Números da página inicial: ativos por tipo e quantos já voltaram para casa. */
  async function estatisticas() {
    const grupos = await prisma.anuncio.groupBy({ by: ["status", "tipo"], _count: { _all: true } });
    const total = (status, tipo) =>
      grupos
        .filter((g) => g.status === status && (!tipo || g.tipo === tipo))
        .reduce((soma, g) => soma + g._count._all, 0);
    return {
      perdidos: total("ativo", "perdido"),
      encontrados: total("ativo", "encontrado"),
      ativos: total("ativo"),
      reencontrados: total("reencontrado"),
    };
  }

  async function correspondencias(codigo) {
    return prisma.$queryRaw`
      SELECT c.codigo, c.tipo, c.data_ocorrencia::text AS data_ocorrencia, c.bairro,
             c.distancia_m, c.cores_em_comum, v.especie, v.porte, v.nome_pet, v.cores,
             v.foto_capa
        FROM sugerir_correspondencias(${codigo}::varchar, ${config.RAIO_CORRESPONDENCIA_M}::int) AS c
        JOIN vw_anuncio_publico v ON v.codigo = c.codigo`;
  }

  async function expirarVencidos() {
    const [{ total }] = await prisma.$queryRaw`SELECT expirar_anuncios() AS total`;
    return total;
  }

  return {
    buscarPorCodigo, apresentar, resumo, criar, atualizar, renovar, marcarReencontrado,
    excluir, listarDoUsuario, recentes, estatisticas, correspondencias, expirarVencidos,
    anunciosNasUltimas24h,
  };
}

