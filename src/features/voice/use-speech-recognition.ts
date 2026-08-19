"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SpeechRecognizer,
  SpeechRecognitionResult,
} from "microsoft-cognitiveservices-speech-sdk";

/**
 * Riconoscimento vocale tramite Azure Speech.
 *
 * Sta dietro un'interfaccia stretta — `start`, `stop`, `listening`, `interim` —
 * perche' e' lo strato piu' probabile da sostituire. La versione precedente
 * usava la Web Speech API del browser: funzionava solo su Chrome ed Edge e
 * mandava l'audio ai server di Google. Azure copre tutti i browser e tiene
 * l'audio dentro la stessa sottoscrizione del resto.
 *
 * L'SDK pesa oltre un megabyte, quindi entra con un `import()` dinamico al
 * primo utilizzo: chi non apre mai la console vocale non lo scarica.
 * La chiave non passa mai di qui — si usa un token effimero da
 * `/api/voice/speech-token`.
 */

const LOCALE = "it-IT";

export interface SpeechRecognitionState {
  listening: boolean;
  /** Trascrizione parziale, mostrata mentre si parla. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

interface SpeechToken {
  token: string;
  region: string;
}

async function fetchToken(): Promise<SpeechToken> {
  const response = await fetch("/api/voice/speech-token", { method: "POST" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error ?? "Token vocale non disponibile.");
  return payload as SpeechToken;
}

export function useSpeechRecognition(
  onFinalTranscript: (transcript: string) => void,
): SpeechRecognitionState {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  // La callback vive in un ref: il riconoscitore si crea una volta per sessione
  // di ascolto, e senza questo continuerebbe a chiamare la versione catturata
  // al momento della creazione.
  const onFinalRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const dispose = useCallback(() => {
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (!recognizer) return;
    recognizer.stopContinuousRecognitionAsync(
      () => recognizer.close(),
      () => recognizer.close(),
    );
  }, []);

  useEffect(() => dispose, [dispose]);

  const start = useCallback(async () => {
    if (recognizerRef.current) return;
    setError(null);
    setInterim("");

    try {
      const [{ token, region }, sdk] = await Promise.all([
        fetchToken(),
        import("microsoft-cognitiveservices-speech-sdk"),
      ]);

      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = LOCALE;
      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      recognizer.recognizing = (_sender, event) => {
        setInterim(event.result.text);
      };

      recognizer.recognized = (_sender, event) => {
        const result: SpeechRecognitionResult = event.result;
        if (result.reason !== sdk.ResultReason.RecognizedSpeech) return;
        const text = result.text.trim();
        if (!text) return;
        setInterim("");
        // Un comando per volta: si smette di ascoltare appena la frase e'
        // completa, cosi' il microfono non resta aperto in un laboratorio.
        setListening(false);
        dispose();
        onFinalRef.current(text);
      };

      recognizer.canceled = (_sender, event) => {
        if (event.reason === sdk.CancellationReason.Error) {
          setError(event.errorDetails || "Riconoscimento vocale interrotto da Azure.");
        }
        setListening(false);
        dispose();
      };

      recognizer.startContinuousRecognitionAsync(
        () => setListening(true),
        (reason) => {
          setError(typeof reason === "string" ? reason : "Microfono non disponibile.");
          setListening(false);
          dispose();
        },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Avvio del riconoscimento fallito.");
      setListening(false);
      dispose();
    }
  }, [dispose]);

  const stop = useCallback(() => {
    setListening(false);
    setInterim("");
    dispose();
  }, [dispose]);

  // Nessun campo `supported`: a differenza della Web Speech API, Azure non
  // dipende da cosa espone il browser. Un microfono assente o un token negato
  // si manifestano come errore all'avvio, non come assenza di funzionalita'.
  return {
    listening,
    interim,
    error,
    start: () => {
      void start();
    },
    stop,
  };
}
