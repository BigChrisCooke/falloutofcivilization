import path from "node:path";

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const clientPort = Number(env.CLIENT_PORT ?? "6200");
  const backendPort = Number(env.BACKEND_PORT ?? env.PORT ?? "6201");
  const apiProxyTarget = (env.VITE_API_BASE_URL?.trim() || `http://localhost:${Number.isFinite(backendPort) ? backendPort : 6201}`).replace(/\/$/u, "");

  return {
    plugins: [react()],
    envDir: "..",
    server: {
      host: true,
      port: Number.isFinite(clientPort) ? clientPort : 6200,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
