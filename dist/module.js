import { defineNuxtModule as a, createResolver as r, addTemplate as l, addImportsDir as c } from "@nuxt/kit";
const u = a({
  meta: {
    name: "nuxt-module-essentia",
    configKey: "essentia",
    compatibility: {
      nuxt: "^3.0.0 || ^4.0.0"
    }
  },
  defaults: {
    publicAssetsPath: "/essentia/"
  },
  setup(e, s) {
    var i;
    const t = r(import.meta.url), o = t.resolve("../src/runtime"), n = t.resolve("../src/runtime/composables");
    (i = s.options.nitro).publicAssets || (i.publicAssets = []), s.options.nitro.publicAssets.push({
      dir: o,
      baseURL: e.publicAssetsPath,
      maxAge: 60 * 60 * 24 * 365
      // 1 год
    }), l({
      filename: "essentia-config.mjs",
      getContents: () => `export const essentiaConfig = ${JSON.stringify({
        publicAssetsPath: e.publicAssetsPath
      })}`
    }), c(n);
  }
});
export {
  u as default
};
