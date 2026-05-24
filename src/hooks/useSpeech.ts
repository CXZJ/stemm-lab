import * as Speech from "expo-speech";
import { useCallback, useState } from "react";

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const speak = useCallback((id: string, text: string) => {
    if (speakingId === id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(id);
    Speech.speak(text, {
      language: "en",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  }, [speakingId]);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeakingId(null);
  }, []);

  const isSpeaking = useCallback((id: string) => speakingId === id, [speakingId]);

  return { speak, stop, isSpeaking, speakingId };
}