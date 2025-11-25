# nuxt-module-essentia
![NPM Downloads](https://img.shields.io/npm/dm/nuxt-module-essentia)

Nuxt модуль для интеграции Essentia.js WASM библиотеки анализа аудио.
Работает на Nuxt 3 и 4

## Установка

```bash
npm install nuxt-module-essentia
```

### Подключение модуля

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["nuxt-module-essentia"],

  essentia: {
    publicAssetsPath: "/essentia/", // опционально
  },
});
```

### Использование композабла

```typescript
// Автоматически доступен в компонентах
const {
  getKeyMoodAndBpm,
  keyBpmResults,
  moodResults,
  resetMoodResults,
  essentia,
  essentiaAnalysis,
  featureExtractionWorker
} = useAudioAnalizer();
```

## Разработка

```bash
# Сборка модуля
npm run build

# Режим разработки с watch
npm run dev
```

## Структура

- `src/module.ts` - основной файл модуля
- `src/runtime/` - runtime файлы (копируются в public)
- `src/runtime/composables/` - композаблы (автоимпорт)
