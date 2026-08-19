import { NextResponse } from "next/server";

/**
 * Emette un token effimero per Azure Speech.
 *
 * Il motivo per cui questa route esiste: l'SDK di Azure Speech gira nel
 * browser, e con `SpeechConfig.fromSubscription` la chiave finirebbe nel
 * bundle, cioe' in mano a chiunque apra gli strumenti di sviluppo. La chiave
 * resta qui sul server e verso il client esce solo un token che scade dopo
 * dieci minuti.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Azure emette token validi 10 minuti; si rinnova prima per non farsi cogliere a meta' frase. */
const TOKEN_TTL_SECONDS = 9 * 60;

export async function POST() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key || !region) {
    return NextResponse.json(
      {
        error:
          "Azure Speech non configurato: servono AZURE_SPEECH_KEY e AZURE_SPEECH_REGION. Vedi .env.example.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": key,
          "Content-Length": "0",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      // Il corpo della risposta di Azure puo' contenere dettagli sulla
      // sottoscrizione: resta nei log del server, non torna al browser.
      console.error(
        "Rilascio token Azure Speech fallito:",
        response.status,
        await response.text().catch(() => ""),
      );
      return NextResponse.json(
        { error: "Azure non ha rilasciato il token vocale." },
        { status: 502 },
      );
    }

    const token = await response.text();
    return NextResponse.json(
      { token, region, expiresInSeconds: TOKEN_TTL_SECONDS },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Rilascio token Azure Speech fallito:", error);
    return NextResponse.json({ error: "Azure non raggiungibile." }, { status: 502 });
  }
}
