import { ref, type Ref } from "vue";
import type {
  EssentiaJS,
  EssentiaVector,
  KeyData,
  BpmData,
} from "../types/essentia";

export interface KeyBpmResult {
  key: string;
  scale: string;
  bpm: number;
}

export const useAudioAnalizer = (colors?: string[]) => {
  if (!import.meta.client) {
    return {
      getKeyMoodAndBpm: () => {},
      keyBpmResults: ref({}),
      moodResults: ref({}),
      resetMoodResults: () => {},
    };
  }

  const defaultColors = [
    "light-blue-lighten-2",
    "light-blue-lighten-1",
    "light-blue-darken-1",
    "light-blue-darken-2",
    "light-blue-darken-3",
  ];

  const moodColors = colors && colors.length === 5 ? colors : defaultColors;

  const DEFAULT_MOOD_VALUE = [
    {
      color: moodColors[0],
      icon: "�",
      title: "Танцевальный",
      key: "danceability",
      value: 0,
    },
    {
      color: moodColors[1],
      icon: "�",
      title: "Радостный",
      key: "mood_happy",
      value: 0,
    },
    {
      color: moodColors[2],
      icon: "�",
      title: "Грустный",
      key: "mood_sad",
      value: 0,
    },
    {
      color: moodColors[3],
      icon: "😌",
      title: "Расслабляющий",
      key: "mood_relaxed",
      value: 0,
    },
    {
      color: moodColors[4],
      icon: "😤",
      title: "Агрессивный",
      key: "mood_aggressive",
      value: 0,
    },
  ];

  const keyBpmResults: Ref<KeyBpmResult | null> = ref(null);

  const moodResults = ref(DEFAULT_MOOD_VALUE);

  let audioCtx: AudioContext;

  if (import.meta.client) {
    // @ts-ignore
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const KEEP_PERCENTAGE = 0.15; // keep only 15% of audio file
  let essentia: EssentiaJS | null = null;
  let essentiaAnalysis: { keyData: KeyData; bpm: number } | null = null;
  let featureExtractionWorker: Worker | null = null;

  let basePath = "/essentia/";
  let inferenceWorker: Worker;

  if (import.meta.client) {
    // Загружаем конфиг асинхронно
    // @ts-expect-error - build-time generated module
    import("#build/essentia-config.mjs")
      .then((module: { essentiaConfig: { publicAssetsPath: string } }) => {
        basePath = module.essentiaConfig.publicAssetsPath;
      })
      .catch(() => {
        basePath = "/essentia/"; // fallback
      });

    createInferenceWorker();
    createFeatureExtractionWorker();

    // Загружаем essentia через глобальный window объект
    const script = document.createElement("script");
    script.src = `${basePath}essentia-wasm.web.js`;
    script.onload = () => {
      window.EssentiaWASM().then((wasmModule) => {
        essentia = new wasmModule.EssentiaJS(false);
        essentia.arrayToVector = wasmModule.arrayToVector;
      });
    };
    document.head.appendChild(script);
  }

  function createInferenceWorker() {
    inferenceWorker = new Worker(`${basePath}workers/inference.js`);
    inferenceWorker.onmessage = function listenToWorker(
      msg: MessageEvent<{ predictions?: Record<string, number> }>,
    ) {
      if (msg.data.predictions) {
        const preds = msg.data.predictions;

        moodResults.value.forEach((mood) => {
          mood.value = Math.ceil(preds[mood.key] * 100);
        });
      }
    };
  }

  function createFeatureExtractionWorker() {
    featureExtractionWorker = new Worker(
      `${basePath}workers/featureExtraction.js`,
    );
    featureExtractionWorker.postMessage({
      init: true,
    });
    featureExtractionWorker.onmessage =
      function listenToFeatureExtractionWorker(
        msg: MessageEvent<{ embeddings?: Float32Array }>,
      ) {
        // feed to models
        if (msg.data.embeddings) {
          // send features off to each of the models
          inferenceWorker.postMessage({
            embeddings: msg.data.embeddings,
          });
        }
      };
  }

  function monomix(buffer: AudioBuffer) {
    // downmix to mono
    let monoAudio;
    if (buffer.numberOfChannels > 1) {
      const leftCh = buffer.getChannelData(0);
      const rightCh = buffer.getChannelData(1);
      // @ts-ignore
      monoAudio = leftCh.map((sample, i) => 0.5 * (sample + rightCh[i]));
    } else {
      monoAudio = buffer.getChannelData(0);
    }

    return monoAudio;
  }

  function shortenAudio(audioIn: Float32Array, keepRatio = 0.5, trim = false) {
    /*
        keepRatio applied after discarding start and end (if trim == true)
    */
    if (keepRatio < 0.15) {
      keepRatio = 0.15; // must keep at least 15% of the file
    } else if (keepRatio > 0.66) {
      keepRatio = 0.66; // will keep at most 2/3 of the file
    }

    if (trim) {
      const discardSamples = Math.floor(0.1 * audioIn.length); // discard 10% on beginning and end
      audioIn = audioIn.subarray(
        discardSamples,
        audioIn.length - discardSamples,
      ); // create new view of buffer without beginning and end
    }

    const ratioSampleLength = Math.ceil(audioIn.length * keepRatio);
    const patchSampleLength = 187 * 256; // cut into patchSize chunks so there's no weird jumps in audio
    const numPatchesToKeep = Math.ceil(ratioSampleLength / patchSampleLength);

    // space patchesToKeep evenly
    const skipSize = Math.floor(
      (audioIn.length - ratioSampleLength) / (numPatchesToKeep - 1),
    );

    let audioOut = [];
    let startIndex = 0;
    for (let i = 0; i < numPatchesToKeep; i++) {
      let endIndex = startIndex + patchSampleLength;
      let chunk = audioIn.slice(startIndex, endIndex);
      audioOut.push(...chunk);
      startIndex = endIndex + skipSize; // discard even space
    }

    return Float32Array.from(audioOut);
  }

  function downsampleArray(
    audioIn: Float32Array,
    sampleRateIn: number,
    sampleRateOut: number,
  ) {
    if (sampleRateOut === sampleRateIn) {
      return audioIn;
    }
    let sampleRateRatio = sampleRateIn / sampleRateOut;
    let newLength = Math.round(audioIn.length / sampleRateRatio);
    let result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetAudioIn = 0;

    while (offsetResult < result.length) {
      let nextOffsetAudioIn = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0,
        count = 0;
      for (
        let i = offsetAudioIn;
        i < nextOffsetAudioIn && i < audioIn.length;
        i++
      ) {
        // @ts-ignore
        accum += audioIn[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetAudioIn = nextOffsetAudioIn;
    }

    return result;
  }

  function median(arr: number[]) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  function estimateTuningFrequency(
    vectorSignal: EssentiaVector,
    sampleRate = 16000,
  ): number {
    // Параметры для pitch-экстракции
    const frameSize = 2048;
    const hopSize = 512;
    const minFreq = 80; // игнорируем басы и шум
    const maxFreq = 1500; // выше — уже не вокал/мелодия
    const confidenceThreshold = 0.7;
    const silenceThreshold = 0.001; // чувствительность к тишине

    if (!essentia) {
      console.warn("Essentia не инициализирована");
      return 440;
    }

    // ✅ Теперь 7 аргументов!
    const pitchResult = essentia.PitchYinFFT(
      vectorSignal,
      sampleRate,
      frameSize,
      hopSize,
      minFreq,
      maxFreq,
      silenceThreshold,
    );

    const centsDeviations = [];

    for (let i = 0; i < pitchResult.pitch.length; i++) {
      const freq = pitchResult.pitch[i];
      const conf = pitchResult.pitchConfidence[i];

      // Фильтруем ненадёжные и нерелевантные частоты
      if (freq >= minFreq && freq <= maxFreq && conf >= confidenceThreshold) {
        // MIDI note относительно A4=440 (MIDI 69)
        const midiNote = 69 + 12 * Math.log2(freq / 440);
        const roundedMidi = Math.round(midiNote);
        const cents = (midiNote - roundedMidi) * 100; // отклонение в центах

        // Ограничиваем выбросы (иногда pitch скачет)
        if (Math.abs(cents) < 50) {
          centsDeviations.push(cents);
        }
      }
    }

    // Если мало данных — возвращаем 440 по умолчанию
    if (centsDeviations.length < 10) {
      console.warn(
        "Недостаточно надёжных данных для оценки строя. Используется A=440.",
      );
      return 440;
    }

    const medianCents = median(centsDeviations);
    const estimatedA = 440 * Math.pow(2, medianCents / 1200);

    // Ограничиваем разумные пределы (обычно A=432–445)
    return Math.max(430, Math.min(450, estimatedA));
  }

  function preprocess(audioBuffer: AudioBuffer) {
    if (audioBuffer instanceof AudioBuffer) {
      const mono = monomix(audioBuffer);
      // downmix to mono, and downsample to 16kHz sr for essentia tensorflow models
      return downsampleArray(mono, audioBuffer.sampleRate, 16000);
    } else {
      throw new TypeError(
        "Input to audio preprocessing is not of type AudioBuffer",
      );
    }
  }

  function computeKeyBPM(audioSignal: Float32Array): {
    keyData: KeyData;
    bpm: number;
  } {
    if (!essentia) {
      throw new Error("Essentia not initialized");
    }

    const vectorSignal = essentia.arrayToVector(audioSignal);

    // TODO: Доделать получение ноты A, пока принимаем что она равна 440гц
    // const estimatedA = estimateTuningFrequency(vectorSignal, 16000);
    // console.log("Оценка строя:", estimatedA.toFixed(2), "Гц"); // например: 439.12

    const keyData = essentia.KeyExtractor(
      vectorSignal,
      true,
      4096,
      4096,
      12,
      3500,
      60,
      25,
      0.2,
      "bgate",
      16000,
      0.0001,
      440,
      "cosine",
      "hann",
    );
    const bpmData = essentia.PercivalBpmEstimator(
      vectorSignal,
      1024,
      2048,
      128,
      128,
      210,
      50,
      16000,
    );

    return {
      keyData,
      bpm: bpmData.bpm,
    };
  }

  function processFile(arrayBuffer: ArrayBuffer) {
    audioCtx.resume().then(() => {
      audioCtx
        .decodeAudioData(arrayBuffer)
        .then(async function handleDecodedAudio(audioBuffer) {
          const prepocessedAudio = preprocess(audioBuffer);
          await audioCtx.suspend();

          if (essentia) {
            essentiaAnalysis = computeKeyBPM(prepocessedAudio);

            const bpmValue =
              essentiaAnalysis.bpm <= 69
                ? essentiaAnalysis.bpm * 2
                : essentiaAnalysis.bpm;

            keyBpmResults.value = {
              key: essentiaAnalysis.keyData.key,
              scale: essentiaAnalysis.keyData.scale,
              bpm: parseFloat(bpmValue.toFixed(2)),
            };
          }

          // reduce amount of audio to analyse
          let audioData = shortenAudio(prepocessedAudio, KEEP_PERCENTAGE, true); // <-- TRIMMED start/end

          // send for feature extraction
          if (featureExtractionWorker) {
            featureExtractionWorker.postMessage(
              {
                audio: audioData.buffer,
              },
              [audioData.buffer],
            );
          }
        });
    });
  }

  const getKeyMoodAndBpm = async (file: File) => {
    file.arrayBuffer().then((arrayBuffer: ArrayBuffer) => {
      processFile(arrayBuffer);
    });
  };

  const resetMoodResults = () => {
    moodResults.value.forEach((moodResult) => {
      moodResult.value = 0;
    });
  };

  return {
    getKeyMoodAndBpm,
    keyBpmResults,
    moodResults,
    resetMoodResults,
    essentia,
    essentiaAnalysis,
    featureExtractionWorker,
  };
};
