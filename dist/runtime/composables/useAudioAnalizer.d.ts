import { type Ref } from "vue";
export interface KeyBpmResult {
    key: string;
    scale: string;
    bpm: number;
}
export declare const useAudioAnalizer: () => {
    getKeyMoodAndBpm: () => void;
    keyBpmResults: Ref<{}, {}>;
    moodResults: Ref<{}, {}>;
    resetMoodResults: () => void;
    essentia?: undefined;
    essentiaAnalysis?: undefined;
    featureExtractionWorker?: undefined;
} | {
    getKeyMoodAndBpm: (file: File) => Promise<void>;
    keyBpmResults: Ref<KeyBpmResult | null, KeyBpmResult | null>;
    moodResults: Ref<{
        color: string;
        icon: string;
        title: string;
        key: string;
        value: number;
    }[], {
        color: string;
        icon: string;
        title: string;
        key: string;
        value: number;
    }[] | {
        color: string;
        icon: string;
        title: string;
        key: string;
        value: number;
    }[]>;
    resetMoodResults: () => void;
    essentia: null;
    essentiaAnalysis: null;
    featureExtractionWorker: null;
};
