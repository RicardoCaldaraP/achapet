# Desafios encontrados e como resolvemos

1. **Busca por distância.** Calcular distância no JavaScript seria lento e impreciso. Usamos o
   PostGIS (tipo `GEOGRAPHY` e índice GIST) e as funções `buscar_anuncios` e
   `sugerir_correspondencias` do próprio banco.

2. **Prisma e o tipo GEOGRAPHY.** O Prisma não tem um tipo para colunas espaciais. Elas aparecem
   como `Unsupported` no `schema.prisma`, e gravamos/lemos o ponto com SQL parametrizado
   (`$queryRaw` com template), que o Prisma transforma em parâmetros e evita SQL injection.
   O resto do CRUD usa os métodos normais do ORM.

3. **API pública do Supabase.** O Supabase expõe as tabelas numa API REST com a chave pública.
   Ligamos Row Level Security sem políticas (ninguém acessa as tabelas direto) e liberamos só a
   função de busca do mural, que roda como `SECURITY DEFINER` e devolve apenas dados públicos com
   o local arredondado. Tudo o que tem regra de negócio passa pelo Express.

4. **Login pelo Supabase com perfil próprio.** A senha fica no Supabase Auth (com hash). A tabela
   `usuario` do nosso modelo guarda o perfil com o mesmo id; por isso `senha_hash` fica nula. O
   cadastro é feito pela API, que valida tudo no servidor, cria o login e o perfil juntos e desfaz
   o login se o perfil falhar.

5. **Fotos sem sobrecarregar a API.** As fotos são comprimidas no navegador (até 1 MB) e enviadas
   direto ao Storage, numa pasta com o id do usuário (uma política do Storage impede enviar para a
   pasta de outra pessoa). A API só recebe e confere os caminhos.

6. **Testar sem internet e sem estragar dados.** O `createApp` recebe as dependências prontas
   (injeção de dependência). Nos testes passamos versões falsas do Supabase e um banco num schema
   separado, criado e apagado pela própria suíte.

7. **Express na Netlify.** A API roda como função serverless com `serverless-http`; o
   `netlify.toml` redireciona `/api/*` para ela. A expiração de anúncios virou uma tarefa
   agendada da Netlify que chama a função `expirar_anuncios()` do banco todo dia.

8. **Limites dos serviços gratuitos.** O Nominatim aceita 1 requisição por segundo: a API faz fila
   e guarda as respostas em cache. CEP usa BrasilAPI e, se falhar, ViaCEP. O PWA guarda em cache
   as fotos e os pedaços do mapa para abrir rápido em rede 4G.
