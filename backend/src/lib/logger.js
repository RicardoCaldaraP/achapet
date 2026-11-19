/** Logger estruturado (JSON) com pino. Em desenvolvimento fica mais legível no terminal. */
import pino from "pino";

export function criarLogger({ nivel = "info", ambiente = "development" } = {}) {
  return pino({
    level: ambiente === "test" ? "silent" : nivel,
    base: { app: "achapet-api" },
    redact: ["req.headers.authorization", "req.headers.cookie"],
  });
}
