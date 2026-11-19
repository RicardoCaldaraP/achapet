import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/preparar-banco.js"],
    fileParallelism: false, // os arquivos de teste dividem o mesmo schema do banco
    coverage: { include: ["src/**"], exclude: ["src/server.js", "src/dependencias.js"] },
  },
});
