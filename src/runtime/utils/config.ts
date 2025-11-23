let cachedConfig: { publicAssetsPath: string } | null = null;

export async function getEssentiaConfig() {
  if (cachedConfig) return cachedConfig;

  if (import.meta.client) {
    // @ts-ignore
    const { essentiaConfig } = await import("#build/essentia-config.mjs");
    cachedConfig = essentiaConfig;
    return essentiaConfig;
  }

  return { publicAssetsPath: "/essentia/" };
}
