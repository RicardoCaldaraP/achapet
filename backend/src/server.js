/** Servidor local de desenvolvimento: npm run dev (http://localhost:3001). */
import { createApp } from "./app.js";
import { criarDependencias } from "./dependencias.js";

const deps = criarDependencias();
const app = createApp(deps);

app.listen(deps.config.PORT, () => {
  deps.logger.info(`API do AchaPet rodando em http://localhost:${deps.config.PORT}`);
});
