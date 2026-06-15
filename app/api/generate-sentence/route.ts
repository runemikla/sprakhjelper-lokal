import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers';

// Input validation schema (7 difficulty levels)
const generateSentenceSchema = z.object({
  level: z.number().int().min(1).max(7),
});

// Azure OpenAI configuration
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

// Level-specific instructions and example sentences for the 7 difficulty
// levels. The examples steer the model towards the right grammatical pattern.
interface LevelSpec {
  instruction: string;
  examples: string[];
}

const LEVEL_SPECS: Record<number, LevelSpec> = {
  1: {
    instruction:
      'Lag en enkel helsetning med mønsteret subjekt + verb + objekt eller adverbial (SVO/SVA). Hold deg til 3–5 ord. Ingen adjektiv, nektelse eller bisetninger.',
    examples: [
      'Jeg leser en bok',
      'Hun drikker kaffe',
      'Vi bor i Bergen',
      'Han kjører bil',
      'De spiller fotball',
    ],
  },
  2: {
    instruction:
      'Lag en kort setning på maks 5 ord som inneholder ENTEN ett adjektiv ELLER ett adverb – ikke begge deler. Bruk grunnleggende ordstilling (subjekt + verb + objekt/adverbial).',
    examples: [
      'Jeg har en ny sykkel',
      'Hun bor i et stort hus',
      'Vi ser en spennende film',
      'Hunden løper fort',
      'Han synger høyt',
    ],
  },
  3: {
    instruction:
      'Lag en setning med nektelse. Ordet «ikke» skal stå riktig plassert (etter det finitte verbet i en helsetning).',
    examples: [
      'Jeg liker ikke fisk',
      'Hun spiser ikke kjøtt',
      'Vi kommer ikke i dag',
      'Han har ikke tid',
      'De forstår ikke oppgaven',
    ],
  },
  4: {
    instruction:
      'Lag en setning som starter med et tidsuttrykk eller annet innledende adverbial, slik at V2-regelen trer i kraft (verbet på plass nummer to, deretter subjektet – inversjon).',
    examples: [
      'I dag skal jeg jobbe hjemme',
      'Om sommeren reiser vi til fjellet',
      'Etter skolen spiller han fotball',
      'Hver morgen drikker hun te',
      'Neste uke begynner vi på et nytt prosjekt',
    ],
  },
  5: {
    instruction:
      'Lag en setning med et modalverb (kan, vil, må, skal eller bør). Modalverbet er finitt, og hovedverbet står i infinitiv.',
    examples: [
      'Jeg må gjøre leksene mine',
      'Hun vil reise til Spania',
      'Vi kan møtes klokken fem',
      'Du bør spise mer frukt',
      'De skal flytte til Oslo neste år',
    ],
  },
  6: {
    instruction:
      'Lag en sammensatt setning med to helsetninger bundet sammen med en konjunksjon: «og», «men», «fordi» eller «så».',
    examples: [
      'Jeg liker te, men jeg liker kaffe enda bedre',
      'Hun var trøtt, så hun gikk og la seg',
      'Vi spiser middag, og deretter ser vi på TV',
      'Han kom sent fordi bussen var forsinket',
      'De ville reise, men de hadde ikke penger',
    ],
  },
  7: {
    instruction:
      'Lag en setning med en leddsetning (bisetning) innledet med «som», «når», «hvis», «at» eller «selv om». Pass på riktig ordstilling i leddsetningen.',
    examples: [
      'Jeg tror at hun kommer i morgen',
      'Hvis det blir sol, skal vi gå en tur',
      'Når jeg blir voksen, vil jeg bli lege',
      'Mannen som bor der, er læreren min',
      'Selv om det var kaldt, badet de i sjøen',
    ],
  },
};

// Themes used to force topical variety between requests. One is picked at
// random per request so the model does not keep defaulting to food/drink.
const TOPICS = [
  'skole og klasserom',
  'fritid og hobbyer',
  'idrett og trening',
  'vær og årstider',
  'reise og ferie',
  'familie og slekt',
  'dyr og natur',
  'jobb og yrker',
  'musikk og instrumenter',
  'film og TV',
  'teknologi og data',
  'helse og kropp',
  'klær og mote',
  'butikk og handel',
  'transport og kjøretøy',
  'høytider og feiring',
  'venner og følelser',
  'byen og bygningene',
  'hjemmet og møbler',
  'bøker og lesing',
  'kunst og maling',
  'hagen og planter',
  'havet og fisking',
  'fjellet og turer',
];

// Varied subjects so sentences do not always start with "Jeg".
const SUBJECTS = [
  'jeg',
  'du',
  'han',
  'hun',
  'vi',
  'de',
  'barna',
  'læreren',
  'gutten',
  'jenta',
  'mannen',
  'kvinnen',
  'familien',
  'elevene',
  'naboen',
];

// Pick a random element from an array.
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export async function POST(req: Request) {
  try {
    // Rate limiting: 20 requests per minute per IP (exercises generate often)
    const rateLimitError = checkRateLimit(req, 20, 60000);
    if (rateLimitError) return rateLimitError;

    // Validate Azure configuration
    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error(
        'Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env'
      );
    }

    // Parse and validate input
    const body = await req.json();
    const { level } = generateSentenceSchema.parse(body);

    const spec = LEVEL_SPECS[level];
    const topic = pickRandom(TOPICS);
    const subject = pickRandom(SUBJECTS);

    // Examples are shown only to convey the grammatical pattern. Strip commas
    // so they do not encourage punctuation in the generated sentence.
    const exampleList = spec.examples
      .map((ex) => `- ${ex.replace(/,/g, '')}`)
      .join('\n');

    // Build system prompt for word-order exercise generation
    const systemPrompt = `Du lager øvingsoppgaver i norsk ordrekkefølge for elever som lærer norsk som andrespråk. Du skal lage ÉN grammatisk korrekt norsk helsetning på bokmål.

##Nivå
${spec.instruction}

Eksempler på riktig mønster for dette nivået (lag en NY setning med samme grammatiske mønster, ikke kopier eksemplene):
${exampleList}

##Krav til setningen
- Setningen skal være helt korrekt norsk med riktig ordstilling.
- Bruk vanlige, hverdagslige ord som elever forstår.
- IKKE bruk komma, punktum eller andre skilletegn i setningen i det hele tatt.
- Hvert "ord" i ordlisten er ett enkelt ord (ingen mellomrom).
- Ikke bruk stor forbokstav midt i setningen unntatt for egennavn.

##Variasjon (svært viktig)
- Varier verbene: bruk mange forskjellige verb, ikke bare "spise", "drikke", "ha" eller "være".
- Varier subjektet og hvordan setningen begynner.
- Hold deg til temaet og subjektet du får oppgitt av brukeren.

##Utdata
Du skal returnere:
- "sentence": hele den korrekte setningen som tekst (uten punktum til slutt).
- "words": en liste med alle ordene i setningen i TILFELDIG (stokket) rekkefølge – IKKE i riktig rekkefølge. Listen må inneholde nøyaktig de samme ordene som i "sentence".

Sørg for at "words" er ekte stokket, slik at den IKKE er identisk med riktig rekkefølge.`;

    // JSON Schema for structured output
    const responseSchema = {
      type: 'object',
      properties: {
        sentence: {
          type: 'string',
          description: 'Den korrekte norske setningen uten punktum til slutt.',
        },
        words: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Alle ordene i setningen i tilfeldig (stokket) rekkefølge. Samme ord som i sentence.',
        },
      },
      required: ['sentence', 'words'],
      additionalProperties: false,
    };

    // Build Azure OpenAI URL
    const azureUrl = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Lag en ny setning på vanskelighetsnivå ${level} av 7.\nTema: ${topic}.\nLa setningen handle om dette temaet, og bruk gjerne "${subject}" som subjekt.\nVelg friske, varierte verb.`,
          },
        ],
        // Some randomness so sentences vary between requests
        temperature: 1,
        max_tokens: 500,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'word_order_exercise',
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Azure OpenAI error status:', response.status);
      }
      throw new Error(
        `Azure OpenAI API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('Empty response from Azure OpenAI');
    }

    // Validate response size (max 10KB - sentences are small)
    validateResponseSize(aiResponse, 10000);

    // Parse JSON response - guaranteed valid by JSON Schema
    const parsed = JSON.parse(aiResponse) as {
      sentence: string;
      words: string[];
    };

    // Derive the correct answer order from the sentence itself. This avoids
    // trusting the model to keep "words" consistent with "sentence".
    const correctWords = parsed.sentence
      .replace(/[.!?]+$/u, '')
      // Strip any stray punctuation (e.g. commas) so tokens stay clean.
      .replace(/[,.;:!?]/gu, ' ')
      .trim()
      .split(/\s+/u)
      .filter(Boolean);

    // Shuffle defensively in case the model returned words in the correct order.
    const shuffledWords = shuffleUnlessDifferent(correctWords);

    return NextResponse.json({
      success: true,
      sentence: parsed.sentence,
      correctWords,
      words: shuffledWords,
      level,
      provider: 'azure',
      isLocal: true,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'Generate sentence API error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

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

/**
 * Fisher-Yates shuffle. Reshuffles until the result differs from the input
 * (unless every word is identical, e.g. a single-word sentence).
 */
function shuffleUnlessDifferent(words: string[]): string[] {
  if (words.length <= 1) return [...words];

  const allSame = words.every((w) => w === words[0]);
  let attempt = 0;

  while (attempt < 10) {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (allSame || shuffled.some((w, i) => w !== words[i])) {
      return shuffled;
    }
    attempt++;
  }

  return [...words].reverse();
}
