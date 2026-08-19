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

/**
 * Azure fattura l'audio a tempo, e il riconoscimento continuo non si ferma da
 * solo: senza questo limite un microfono lasciato aperto per distrazione — in un
 * laboratorio, con le mani occupate, e' lo scenario normale e non l'eccezione —
 * continua a costare finche' qualcuno non se ne accorge.
 *
 * Servono **due** limiti, non uno.
 *
 * Il primo e' sul silenzio e si riarma a ogni risultato parziale: un limite
 * fisso dall'apertura taglierebbe a meta' chi comincia a parlare tardi, che e'
 * esattamente la persona a cui il margine dovrebbe servire.
 *
 * Il secondo e' un tetto assoluto sulla sessione, e serve proprio perche' il
 * primo si riarma: in un laboratorio il rumore di fondo produce risultati
 * parziali, quindi il solo timer di silenzio si rinnoverebbe all'infinito e non
 * garantirebbe piu' nulla. Senza il tetto, il soffitto di fatto sarebbe la
 * scadenza del token di trascrizione — dieci minuti di audio fatturato contro i
 * quattro secondi di un comando.
 */
const SILENCE_TIMEOUT_MS = 8_000;
const MAX_SESSION_MS = 60_000;

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // `start` fa due await prima di assegnare il recognizer: senza questo, due
  // click ravvicinati aprono due sessioni e la prima resta viva senza
  // riferimento, cioe' un microfono aperto che nessuno puo' piu' chiudere.
  const startingRef = useRef(false);
  // La callback vive in un ref: il riconoscitore si crea una volta per sessione
  // di ascolto, e senza questo continuerebbe a chiamare la versione catturata
  // al momento della creazione.
  const onFinalRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (sessionCapRef.current) {
      clearTimeout(sessionCapRef.current);
      sessionCapRef.current = null;
    }
  }, []);

  const dispose = useCallback(() => {
    clearTimers();
    startingRef.current = false;
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (!recognizer) return;
    recognizer.stopContinuousRecognitionAsync(
      () => recognizer.close(),
      () => recognizer.close(),
    );
  }, [clearTimers]);

  useEffect(() => dispose, [dispose]);

  const closeWith = useCallback(
    (message: string) => {
      setError(message);
      setListening(false);
      dispose();
    },
    [dispose],
  );

  const armSilenceTimer = useCallback(() => {
    // Un evento di coda puo' arrivare dopo `dispose`, mentre la sessione si sta
    // chiudendo: senza questa guardia armerebbe un timer su una sessione morta,
    // che poi spegnerebbe l'interfaccia mentre il comando e' gia' in esecuzione.
    if (!recognizerRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => closeWith("Nessun comando riconosciuto: microfono chiuso."),
      SILENCE_TIMEOUT_MS,
    );
  }, [closeWith]);

  const start = useCallback(async () => {
    if (recognizerRef.current || startingRef.current) return;
    startingRef.current = true;
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
      // `stop()` chiamato durante l'attesa qui sopra ha gia' azzerato il flag:
      // in quel caso l'utente non vuole piu' ascoltare, e aprire il microfono
      // adesso sarebbe il contrario di quello che ha chiesto.
      if (!startingRef.current) {
        recognizer.close();
        return;
      }
      recognizerRef.current = recognizer;
      startingRef.current = false;

      recognizer.recognizing = (_sender, event) => {
        setInterim(event.result.text);
        armSilenceTimer();
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
        () => {
          setListening(true);
          armSilenceTimer();
          sessionCapRef.current = setTimeout(
            () => closeWith("Sessione vocale troppo lunga: microfono chiuso."),
            MAX_SESSION_MS,
          );
        },
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
  }, [dispose, armSilenceTimer, closeWith]);

  const stop = useCallback(() => {
    startingRef.current = false;
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
