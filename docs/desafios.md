# Desafios encontrados e como resolvemos

1. **Busca por distância.** Calcular distância em Python seria lento e impreciso. Usamos o PostGIS
   (tipo `GEOGRAPHY` e índice GIST) e as funções `buscar_anuncios` e `sugerir_correspondencias`
   no próprio banco. O Flask chama essas funções com parâmetros nomeados (sem concatenar SQL).

2. **Valores gerados pelo banco no ORM.** O código curto, as datas de criação e de expiração vêm
   de `DEFAULT` do PostgreSQL. Marcamos as colunas com `FetchedValue()` e `eager_defaults`, para o
   SQLAlchemy ler os valores logo após o `INSERT` (via `RETURNING`).

3. **Script SQL com `$$` e `::`.** O Alembic interpreta `:nome` como parâmetro. A migration inicial
   executa o arquivo com `exec_driver_sql`, que envia o texto direto ao driver.

4. **Testes sem estragar os dados.** Só temos um banco no plano gratuito do Supabase. Os testes
   criam um schema `testes`, ajustam o `search_path` de cada conexão e apagam o schema no fim.

5. **API pública do Supabase.** O Supabase expõe as tabelas do schema `public` numa API REST.
   A migration `0002` ativa Row Level Security sem políticas e revoga o acesso à view e às
   funções, então os dados só são acessados pelo Flask.

6. **Privacidade.** O mapa público mostra o ponto arredondado em ~300 m, o telefone só aparece
   para quem está logado e as fotos têm os metadados EXIF (que podem conter GPS) removidos.

7. **Fotos pesadas do celular.** As fotos são reduzidas no navegador (até 1 MB) e de novo no
   servidor com o Pillow (lado máximo de 1280 px).

8. **Limites dos serviços gratuitos.** O Nominatim permite 1 requisição por segundo: há uma
   trava com espera e cache das respostas. CEP usa BrasilAPI e, se falhar, ViaCEP.
