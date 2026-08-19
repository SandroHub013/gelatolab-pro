import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
import { VOICE_TOOLS, toCommand, type VoiceCommand } from "@/features/voice/commands";
import {
  VOICE_SYSTEM_PROMPT,
  renderCatalog,
  renderState,
  type VoiceContext,
} from "@/features/voice/context";

/**
 * Traduce una frase dettata in un comando dell'applicazione.
 *
 * Questa route **non esegue niente**: interpreta e restituisce. L'esecuzione
 * resta al client, che passa per lo store e per le server action gia'
 * esistenti — le stesse che usano i bottoni. Un assistente vocale che avesse
 * una sua strada per scrivere sul database sarebbe una seconda
 * implementazione da tenere allineata, e prima o poi divergerebbe.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";

interface InterpretRequest {
  transcript: string;
  context: VoiceContext;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_FOUNDRY_API_KEY || !process.env.ANTHROPIC_FOUNDRY_RESOURCE) {
    return NextResponse.json(
      {
        error:
          "Foundry non configurato: l'assistente vocale e' disattivato. Servono ANTHROPIC_FOUNDRY_RESOURCE e ANTHROPIC_FOUNDRY_API_KEY, vedi .env.example.",
      },
      { status: 503 },
    );
  }

  let body: InterpretRequest;
  try {
    body = (await request.json()) as InterpretRequest;
  } catch {
    return badRequest("Corpo della richiesta non valido.");
  }

  const transcript = body?.transcript?.trim();
  if (!transcript) return badRequest("Trascrizione vuota.");
  if (transcript.length > 500) return badRequest("Trascrizione troppo lunga.");
  if (!body.context) return badRequest("Contesto mancante.");

  // `AnthropicFoundry` estende `Anthropic`: la chiamata sotto e' identica a
  // quella verso l'API di prima parte, e le classi d'errore sono le stesse.
  // Legge da se' ANTHROPIC_FOUNDRY_RESOURCE e ANTHROPIC_FOUNDRY_API_KEY.
  const client = new AnthropicFoundry();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      // `low`: la scelta fra quindici strumenti con il contesto gia' davanti non
      // e' un problema di ragionamento profondo, ed e' un percorso interattivo
      // dove la latenza si sente.
      // Su Foundry `effort`, `strict` e il prompt caching sono in beta, non GA
      // come sull'API di prima parte: se una di queste tre smettesse di essere
      // accettata, l'errore arriva qui come 400 e non come comportamento strano.
      output_config: { effort: "low" },
      system: [
        { type: "text", text: VOICE_SYSTEM_PROMPT },
        {
          type: "text",
          text: renderCatalog(body.context),
          // Il catalogo apre il prompt ed e' stabile: da qui in su si riusa.
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: renderState(body.context) },
      ],
      tools: VOICE_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
        // Con `strict` i parametri arrivano gia' conformi allo schema: niente
        // grammi come stringa, niente enum fuori elenco.
        strict: true,
      })),
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: transcript }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    const command: VoiceCommand = toolUse
      ? toCommand(toolUse.name, toolUse.input)
      : {
          kind: "unsupported",
          reason: "Non ho capito il comando.",
        };

    return NextResponse.json({
      command,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Chiave API non valida." }, { status: 503 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Troppe richieste, riprova fra qualche secondo." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Interpretazione vocale fallita:", error.status, error.message);
      return NextResponse.json(
        { error: "Il servizio di interpretazione non ha risposto." },
        { status: 502 },
      );
    }
    console.error("Interpretazione vocale fallita:", error);
    return NextResponse.json({ error: "Errore imprevisto." }, { status: 500 });
  }
}
