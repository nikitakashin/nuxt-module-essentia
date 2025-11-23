import { defineNuxtModule, createResolver, addImportsDir, addTemplate } from "@nuxt/kit";

export interface ModuleOptions {
  publicAssetsPath: string;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-module-essentia",
    configKey: "essentia",
    compatibility: {
      nuxt: "^3.0.0 || ^4.0.0",
    },
  },
  defaults: {
    publicAssetsPath: "/essentia/",
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    const runtimeDir = resolver.resolve("../src/runtime");
    const composablesDir = resolver.resolve("../src/runtime/composables");

    nuxt.options.nitro.publicAssets ||= [];
    nuxt.options.nitro.publicAssets.push({
      dir: runtimeDir,
      baseURL: options.publicAssetsPath,
      maxAge: 60 * 60 * 24 * 365, // 1 год
    });

    addTemplate({
      filename: "essentia-config.mjs",
      getContents: () =>
        `export const essentiaConfig = ${JSON.stringify({
          publicAssetsPath: options.publicAssetsPath,
        })}`,
    });

    addImportsDir(composablesDir);
  },
});
