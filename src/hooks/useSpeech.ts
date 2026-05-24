import * as Speech from "expo-speech";
import { useCallback, useRef, useState } from "react";

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const currentIdRef = useRef<string | null>(null);

  const speak = useCallback((id: string, text: string) => {
    if (currentIdRef.current === id) {
      Speech.stop();
      currentIdRef.current = null;
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    currentIdRef.current = id;
    setSpeakingId(id);
    Speech.speak(text, {
      language: "en",
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        if (currentIdRef.current === id) {
          currentIdRef.current = null;
          setSpeakingId(null);
        }
      },
      onError: () => {
        if (currentIdRef.current === id) {
          currentIdRef.current = null;
          setSpeakingId(null);
        }
      },
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    currentIdRef.current = null;
    setSpeakingId(null);
  }, []);

  const isSpeaking = (id: string) => speakingId === id;

  return { speak, stop, isSpeaking, speakingId };
}