import type { Source } from "./source.js";
import type { VoiceData } from "./voice/types.js";
import { speechFor } from "./speech.js";

export interface SpeechBeatPlan {
  anchor: string;
  text: string;
  speech: string;
  preparation: "explicit" | "rules" | "original";
  spokenCharacters: number;
}

/** Read-only preparation: no engine discovery, synthesis, fingerprint or cache writes. */
export function speechPlan(source: Source, override?: VoiceData): {
  scenes: Array<{ id: string; beats: SpeechBeatPlan[] }>;
} {
  const voice = override ?? source.voice;
  const rules = voice?.rules ?? source.pronounce;
  return { scenes: source.scenes.map((scene) => ({
    id: scene.id,
    beats: scene.beats.map((beat, i) => {
      const speech = beat.speech ?? speechFor(rules, beat.text, source.dir);
      return { anchor: `b${i + 1}`, text: beat.text, speech,
        preparation: beat.speech !== undefined ? "explicit" : rules ? "rules" : "original",
        spokenCharacters: speech.length };
    }),
  })) };
}
