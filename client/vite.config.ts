import path from "node:path";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const clientPort = Number(env.CLIENT_PORT ?? "6200");

  return {
    plugins: [react()],
    envDir: "..",
    server: {
      host: true,
      port: Number.isFinite(clientPort) ? clientPort : 6200
    }
  };
});
