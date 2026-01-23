import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Подхватываем переменные окружения (для локального запуска и для Actions, если задашь Secrets)
  const env = loadEnv(mode, ".", "");

  return {
    // ВАЖНО для GitHub Pages, когда сайт лежит в репозитории /sneg-1/
    base: mode === 'production' ? "/sneg-1/" : "/",

    plugins: [react()],

    server: {
      port: 3000,
      host: "0.0.0.0",
      fs: {
        strict: false,
        allow: [".", ".."],
      },
    },

    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY ?? ""),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY ?? ""),
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },

    // На всякий случай (стабильно для Pages)
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});

