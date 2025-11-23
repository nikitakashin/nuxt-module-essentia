import { type Ref } from "vue";
export declare const useAudioAnalizer: () => {
    getKeyMoodAndBpm: () => void;
    keyBpmResults: Ref<{}, {}>;
    moodResults: Ref<{}, {}>;
    resetMoodResults: () => void;
} | {
    getKeyMoodAndBpm: (file: File) => Promise<void>;
    keyBpmResults: Ref<{
        key: string;
        bpm: number;
        scale: string;
    } | null, {
        key: string;
        bpm: number;
        scale: string;
    } | null>;
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
};
