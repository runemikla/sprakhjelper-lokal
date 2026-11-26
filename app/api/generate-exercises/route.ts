import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers';
import { getInstruction } from '@/lib/ai/instruction-store';
import { azureChatCompletion, isAzureConfigured } from '@/lib/ai/azure';
import { NIVAAER, feiltypeTabell, maksFeiltyper } from '@/lib/ovinger/feiltyper';
import { OVINGER_SVARSKJEMA as responseSchema } from '@/lib/ovinger/skjema';
import { validerSvar, type RaattSvar } from '@/lib/ovinger/valider';

// Skrivehjelp: finner og klassifiserer feilene i elevteksten, velger 1–3
// feiltyper og lager tilpassede øvinger i to formater (bygg setningen og
// velg riktig ord). Grunnlag: «Feiltyper i elevtekster og øvinger (A1–B2)».

const inputSchema = z.object({
  originalText: z.string().min(1).max(5000),
  morsmaal: z.string().min(1).max(50),
  nivaa: z.enum(NIVAAER as [string, ...string[]]),
  // Setningene slik Skrivehjelp allerede har rettet dem. Hjelper modellen å
  // rette på samme måte som eleven nettopp har sett.
  setninger: z
    .array(
      z.object({
        elev: z.string().max(1000),
        rettet: z.string().max(1000),
      })
    )
    .max(80)
    .optional(),
});

export async function POST(req: Request) {
  try {
    // Tung forespørsel: 5 per minutt per IP, som sammendraget.
    const rateLimitError = checkRateLimit(req, 5, 60000);
    if (rateLimitError) return rateLimitError;

    if (!isAzureConfigured()) {
      throw new Error(
        'Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env'
      );
    }

    const body = await req.json();
    const { originalText, morsmaal, nivaa, setninger } = inputSchema.parse(body);
    const level = nivaa as (typeof NIVAAER)[number];

    const systemPrompt = await getInstruction('skrivehjelp_ovinger', {
      morsmaal,
      nivaa: level,
      maks_feiltyper: maksFeiltyper(level),
      feiltyper: feiltypeTabell(),
    });

    let userContent = `Elevens nivå: ${level}\n\nTekst fra eleven:\n\n${originalText}`;
    const rettede = (setninger ?? []).filter((s) => s.elev.trim() && s.rettet.trim());
    if (rettede.length > 0) {
      const liste = rettede
        .map((s) => `- Elev: ${s.elev}\n  Rettet: ${s.rettet}`)
        .join('\n');
      userContent += `\n\nSetningene slik de er rettet i Skrivehjelp (bruk samme rettinger):\n${liste}`;
    }

    const response = await azureChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.4,
      max_completion_tokens: 6000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'tilpassede_ovinger',
          strict: true,
          schema: responseSchema,
        },
      },
    }, 'grammatikk-ovinger');

    if (!response.ok) {
      console.error('Generate exercises: Azure OpenAI error status', response.status);
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();
    if (!aiResponse) {
      throw new Error('Empty response from Azure OpenAI');
    }

    validateResponseSize(aiResponse, 100000);

    const parsed = JSON.parse(aiResponse) as RaattSvar;
    const resultat = validerSvar(parsed, level);

    return NextResponse.json({ success: true, ...resultat });
  } catch (error) {
    console.error(
      'Generate exercises API error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'An error occurred processing your request',
      },
      { status: 500 }
    );
  }
}
