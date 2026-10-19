import { defineConfig } from "vite";

const isolationHeaders={
  "Cross-Origin-Opener-Policy":"same-origin",
  "Cross-Origin-Embedder-Policy":"require-corp",
  "Cross-Origin-Resource-Policy":"same-origin",
};

export default defineConfig({
  optimizeDeps:{
    exclude:["@mediapipe/tasks-vision"],
  },
  worker:{
    format:"es",
  },
  server:{
    headers:isolationHeaders,
  },
  preview:{
    headers:isolationHeaders,
  },
});
