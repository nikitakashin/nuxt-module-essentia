export interface EssentiaVector {
  size(): number;
  get(index: number): number;
  set(index: number, value: number): void;
  delete(): void;
}

export interface KeyData {
  key: string;
  scale: string;
  strength: number;
}

export interface BpmData {
  bpm: number;
}

export interface PitchData {
  pitch: Float32Array;
  pitchConfidence: Float32Array;
}

export interface EssentiaJS {
  arrayToVector(array: Float32Array): EssentiaVector;
  
  KeyExtractor(
    signal: EssentiaVector,
    averageDetuningCorrection?: boolean,
    frameSize?: number,
    hopSize?: number,
    hpcpSize?: number,
    maxFrequency?: number,
    maximumSpectralPeaks?: number,
    minFrequency?: number,
    pcpThreshold?: number,
    profileType?: string,
    sampleRate?: number,
    spectralPeaksThreshold?: number,
    tuningFrequency?: number,
    weightType?: string,
    windowType?: string
  ): KeyData;
  
  PercivalBpmEstimator(
    signal: EssentiaVector,
    frameSize?: number,
    frameSizeOSS?: number,
    hopSize?: number,
    hopSizeOSS?: number,
    maxBPM?: number,
    minBPM?: number,
    sampleRate?: number
  ): BpmData;
  
  PitchYinFFT(
    signal: EssentiaVector,
    sampleRate?: number,
    frameSize?: number,
    hopSize?: number,
    minFrequency?: number,
    maxFrequency?: number,
    silenceThreshold?: number
  ): PitchData;
  
  shutdown(): void;
}

export interface EssentiaWASMModule {
  EssentiaJS: new (logLevel: boolean) => EssentiaJS;
  arrayToVector(array: Float32Array): EssentiaVector;
}

declare global {
  interface Window {
    EssentiaWASM(): Promise<EssentiaWASMModule>;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}
