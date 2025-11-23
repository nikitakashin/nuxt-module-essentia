import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/module.ts"),
      name: "NuxtModuleEssentia",
      fileName: "module",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@nuxt/kit", "nuxt", "@nuxt/schema"],
      output: {
        exports: "named",
      },
    },
    outDir: "dist",
    emptyOutDir: false,
  },
});
