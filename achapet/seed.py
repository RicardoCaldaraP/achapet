"""Dados de demonstração na Grande Vitória (ES). Uso: flask seed

Cria usuários de exemplo (todos com a mesma senha) e anúncios espalhados por
Vitória, Vila Velha, Serra e Cariacica, incluindo pares que se correspondem.
Rodar de novo não duplica nada: usuários já existentes são ignorados.
"""

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

from achapet.ext.db import db
from achapet.models import Anuncio, Cor, Denuncia, Usuario, ponto

USUARIOS = [
    # nome, e-mail, telefone, perfil, papel
    ("Ricardo Caldara", "ricardo@achapet.dev", "5527999990001", "pessoa", "moderador"),
    ("Ana Clara Schmidt", "ana@achapet.dev", "5527999990002", "pessoa", "usuario"),
    ("Bernardo Proti", "bernardo@achapet.dev", "5527999990003", "protetor", "usuario"),
    ("ONG Patas Capixabas", "ong@achapet.dev", "5527999990004", "ong", "usuario"),
    ("Marina Lopes", "marina@achapet.dev", "5527999990005", "pessoa", "usuario"),
]

# autor, tipo, espécie, porte, sexo, nome, raça, cores, dias atrás,
# lat, lng, bairro, cidade, descrição
ANUNCIOS = [
    (
        "marina",
        "perdido",
        "cachorro",
        "medio",
        "macho",
        "Thor",
        "SRD",
        ["caramelo", "branco"],
        2,
        -20.3328,
        -40.2876,
        "Praia da Costa",
        "Vila Velha",
        "Fugiu durante a queima de fogos. Coleira vermelha, atende pelo nome e é muito dócil.",
    ),
    (
        "ong",
        "encontrado",
        "cachorro",
        "medio",
        "macho",
        None,
        "SRD",
        ["caramelo"],
        1,
        -20.3405,
        -40.2902,
        "Itapuã",
        "Vila Velha",
        "Encontrado perto da orla, assustado e sem coleira. Está seguro no nosso lar temporário.",
    ),
    (
        "ana",
        "perdido",
        "gato",
        "pequeno",
        "femea",
        "Mimi",
        None,
        ["cinza", "rajado"],
        4,
        -20.2832,
        -40.2938,
        "Jardim da Penha",
        "Vitória",
        "Gata castrada, muito medrosa. Pode estar escondida em garagens da rua.",
    ),
    (
        "bernardo",
        "encontrado",
        "gato",
        "pequeno",
        "nao_sei",
        None,
        None,
        ["cinza"],
        2,
        -20.2878,
        -40.2985,
        "Jardim da Penha",
        "Vitória",
        "Gatinha cinza apareceu no prédio. Parece ser de casa, está bem cuidada.",
    ),
    (
        "marina",
        "perdido",
        "cachorro",
        "pequeno",
        "femea",
        "Pipoca",
        "Poodle",
        ["branco"],
        6,
        -20.2955,
        -40.2952,
        "Praia do Canto",
        "Vitória",
        "Poodle idosa, enxerga pouco. Precisa de remédio para o coração.",
    ),
    (
        "ong",
        "encontrado",
        "cachorro",
        "grande",
        "macho",
        None,
        "Labrador",
        ["preto"],
        3,
        -20.2617,
        -40.2679,
        "Jardim Camburi",
        "Vitória",
        "Labrador preto com coleira azul sem plaquinha, perto da praça. Muito brincalhão.",
    ),
    (
        "ana",
        "perdido",
        "cachorro",
        "grande",
        "macho",
        "Bob",
        "Labrador",
        ["preto"],
        5,
        -20.2580,
        -40.2710,
        "Jardim Camburi",
        "Vitória",
        "Saiu pelo portão aberto. Coleira azul, castrado, tem uma cicatriz na pata traseira.",
    ),
    (
        "bernardo",
        "encontrado",
        "outro",
        "pequeno",
        "nao_sei",
        None,
        "Calopsita",
        ["cinza", "dourado"],
        1,
        -20.3191,
        -40.3381,
        "Centro",
        "Vitória",
        "Calopsita pousou na janela do escritório. Fala algumas palavras.",
    ),
    (
        "marina",
        "perdido",
        "gato",
        "medio",
        "macho",
        "Frajola",
        None,
        ["preto", "branco"],
        9,
        -20.1992,
        -40.2531,
        "Laranjeiras",
        "Serra",
        "Gato frajola, castrado, com coleira laranja com guizo.",
    ),
    (
        "ong",
        "encontrado",
        "cachorro",
        "pequeno",
        "femea",
        None,
        "SRD",
        ["marrom", "creme"],
        0,
        -20.3331,
        -40.3872,
        "Campo Grande",
        "Cariacica",
        "Cadelinha encontrada no terminal, com roupinha. Alguém deve estar procurando.",
    ),
    (
        "ana",
        "perdido",
        "cachorro",
        "medio",
        "femea",
        "Luna",
        "Vira-lata",
        ["caramelo"],
        12,
        -20.3070,
        -40.3170,
        "Bento Ferreira",
        "Vitória",
        "Luna é tímida, não corra atrás dela.",
    ),
]


def _buscar_cores(nomes: list[str]) -> list[Cor]:
    return list(db.session.scalars(select(Cor).where(Cor.nome.in_(nomes))))


def popular(senha: str) -> str:
    usuarios = {}
    novos = 0
    for nome, email, telefone, perfil, papel in USUARIOS:
        usuario = db.session.scalar(select(Usuario).where(Usuario.email == email))
        if usuario is None:
            usuario = Usuario(
                nome=nome,
                email=email,
                telefone=telefone,
                perfil=perfil,
                papel=papel,
                verificado=perfil == "ong",
                aceite_termos_em=datetime.now(timezone.utc),
            )
            usuario.definir_senha(senha)
            db.session.add(usuario)
            novos += 1
        usuarios[email.split("@")[0]] = usuario
    db.session.flush()

    if db.session.scalar(select(Anuncio.id).limit(1)) is not None:
        db.session.commit()
        return f"{novos} usuário(s) criados; anúncios já existiam, nada mais a fazer."

    criados = []
    for (
        autor,
        tipo,
        especie,
        porte,
        sexo,
        nome,
        raca,
        cores,
        dias,
        lat,
        lng,
        bairro,
        cidade,
        descricao,
    ) in ANUNCIOS:
        anuncio = Anuncio(
            usuario_id=usuarios[autor].id,
            tipo=tipo,
            especie=especie,
            porte=porte,
            sexo=sexo,
            nome_pet=nome,
            raca=raca,
            descricao=descricao,
            data_ocorrencia=date.today() - timedelta(days=dias),
            localizacao=ponto(lat, lng),
            bairro=bairro,
            cidade=cidade,
            uf="ES",
        )
        anuncio.cores = _buscar_cores(cores)
        db.session.add(anuncio)
        criados.append(anuncio)
    db.session.flush()

    # Um caso que já terminou bem e uma denúncia para mostrar a moderação.
    luna = criados[-1]
    luna.status = "reencontrado"
    luna.reencontrado_em = datetime.now(timezone.utc)
    db.session.add(
        Denuncia(
            anuncio_id=criados[7].id,
            denunciante_id=usuarios["marina"].id,
            motivo="duplicado",
            detalhe="Acho que já vi este anúncio em outro lugar.",
        )
    )
    db.session.commit()
    return (
        f"{novos} usuário(s) e {len(criados)} anúncio(s) criados. "
        f"Senha de todos: {senha}. Moderador: ricardo@achapet.dev"
    )
