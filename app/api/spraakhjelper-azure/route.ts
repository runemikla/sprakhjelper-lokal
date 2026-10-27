import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers';
import { TRANSFER_ERRORS } from '@/lib/ai/transfer-errors';
import { transferErrorVariables } from '@/lib/ai/instructions';
import { getInstruction } from '@/lib/ai/instruction-store';

// Input validation schema
const spraakhjelpperSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long (max 5000 characters)'),
  morsmaal: z.string().min(1, 'Mother language is required').max(50, 'Language name too long'),
});

// Azure OpenAI configuration
const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const AZURE_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const AZURE_DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o';
const AZURE_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';

export async function POST(req: Request) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const rateLimitError = checkRateLimit(req, 10, 60000);
    if (rateLimitError) return rateLimitError;

    // Validate Azure configuration
    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error('Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env');
    }

    // Parse and validate input
    const body = await req.json();
    const { text, morsmaal } = spraakhjelpperSchema.parse(body);

    console.log('Processing spraakhjelper request for language:', morsmaal);
    console.log('Using Azure OpenAI endpoint:', AZURE_ENDPOINT);

    // Get transfer errors for this specific language
    const transferErrors = TRANSFER_ERRORS[morsmaal] || '';

    // Build system prompt from the active instruction version (or the default)
    const systemPrompt = await getInstruction('skrivehjelp_analyse', {
      morsmaal,
      ...transferErrorVariables(morsmaal, transferErrors),
    });

    // Define JSON Schema for structured output (Azure requires object at top level)
    const responseSchema = {
      type: "object",
      properties: {
        sentences: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bruker_setning: {
                type: "string",
                description: "Den opprinnelige setningen slik eleven skrev den."
              },
              riktig_setning: {
                type: "string",
                description: "Setningen omskrevet korrekt."
              },
              forklaring: {
                type: "string",
                description: "Punktvis forklaring på norsk hva som er galt og hvorfor."
              },
              forklaring_morsmaal: {
                type: "string",
                description: `Forklaringen oversatt til ${morsmaal}.`
              },
              setning_status: {
                type: "string",
                enum: ["riktig", "feil"],
                description: "Status 'riktig' hvis setningen er korrekt (ignorer tegnsetting). Godta a/en-endelser og a/et-endelser i verb."
              }
            },
            required: ["bruker_setning", "riktig_setning", "forklaring", "forklaring_morsmaal", "setning_status"],
            additionalProperties: false
          }
        }
      },
      required: ["sentences"],
      additionalProperties: false
    };

    // Build Azure OpenAI URL
    const azureUrl = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_API_VERSION}`;

    // Make API call to Azure OpenAI with structured output
    console.log('Calling Azure OpenAI with structured output...');
    const response = await fetch(azureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Tekst fra eleven: ${text}` }
        ],
        temperature: 0,
        max_completion_tokens: 4000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "sentence_analysis",
            strict: true,
            schema: responseSchema
          }
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Secure logging: Only log status code, never full error data
      if (process.env.NODE_ENV === 'development') {
        console.error('Azure OpenAI error status:', response.status);
      }
      throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('Empty response from Azure OpenAI');
    }

    // Validate response size (max 50KB)
    validateResponseSize(aiResponse, 50000);

    console.log('Received response from Azure OpenAI (structured output)');

    // Parse JSON response - guaranteed valid by JSON Schema
    const parsedResponse = JSON.parse(aiResponse);

    // Extract sentences array from the wrapper object
    const sentences = parsedResponse.sentences || [];

    // Generate a temporary submission ID for client-side tracking
    const submissionId = `azure-${Date.now()}-${crypto.randomUUID()}`;

    // Add sentence_id and handle edge cases
    const resultsWithStatus = sentences.map((sentenceObj: any, index: number) => {
      let forklaring = sentenceObj.forklaring;
      let forklaringMorsmaal = sentenceObj.forklaring_morsmaal;

      // If sentence is correct but no explanation, provide positive feedback
      if (sentenceObj.setning_status === 'riktig' && (!forklaring || forklaring.trim() === '')) {
        forklaring = 'Denne setningen er riktig! Godt jobbet! 🎉';
      }

      if (sentenceObj.setning_status === 'riktig' && (!forklaringMorsmaal || forklaringMorsmaal.trim() === '')) {
        forklaringMorsmaal = forklaring;
      }

      return {
        ...sentenceObj,
        forklaring,
        forklaring_morsmaal: forklaringMorsmaal,
        sentence_id: `${submissionId}-${index}`,
      };
    });

    return NextResponse.json({
      success: true,
      submissionId,
      results: resultsWithStatus,
      morsmaal,
      originalText: text,
      savedToDatabase: false,
      isLocal: true,
      provider: 'azure',
    });

  } catch (error) {
    // Secure logging: Only log error type and message, never full error object
    if (process.env.NODE_ENV === 'development') {
      console.error('Spraakhjelper Azure API error:', error instanceof Error ? error.message : 'Unknown error');
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
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Unknown error')
          : 'An error occurred processing your request'
      },
      { status: 500 }
    );
  }
}

