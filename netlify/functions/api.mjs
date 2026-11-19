/**
 * A API Express rodando como função serverless da Netlify.
 * O netlify.toml redireciona /api/* para esta função.
 */
import serverless from "serverless-http";
import { createApp } from "../../backend/src/app.js";
import { criarDependencias } from "../../backend/src/dependencias.js";

const app = createApp(criarDependencias());

export const handler = serverless(app, {
  // Quando a chamada chega pelo caminho interno da função, devolve o prefixo /api.
  request(req) {
    req.url = req.url.replace(/^\/\.netlify\/functions\/api/, "/api");
  },
});
