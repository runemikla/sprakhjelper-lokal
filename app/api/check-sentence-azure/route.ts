import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers';
import { getInstruction } from '@/lib/ai/instruction-store';
import { azureChatCompletion, isAzureConfigured } from '@/lib/ai/azure';

// Input validation schema
const checkSentenceSchema = z.object({
  sentence: z.string().min(1, 'Sentence is required').max(1000, 'Sentence too long (max 1000 characters)'),
  correctSentence: z.string().min(1, 'Correct sentence is required').max(1000, 'Sentence too long'),
  morsmaal: z.string().min(1, 'Mother language is required').max(50, 'Language name too long'),
});

export async function POST(req: Request) {
  try {
    // Rate limiting: 10 requests per minute per IP
    const rateLimitError = checkRateLimit(req, 10, 60000);
    if (rateLimitError) return rateLimitError;
    
    // Validate Azure configuration
    if (!isAzureConfigured()) {
      throw new Error('Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env');
    }

    // Parse and validate input
    const body = await req.json();
    const { sentence, correctSentence, morsmaal } = checkSentenceSchema.parse(body);

    console.log('Checking sentence for language:', morsmaal);

    // Build system prompt from the active instruction version (or the default)
    const systemPrompt = await getInstruction('skrivehjelp_setningssjekk', {
      morsmaal,
      elevens_setning: sentence,
      fasitsetning: correctSentence,
    });

    // Define JSON Schema for structured output
    const responseSchema = {
      type: "object",
      properties: {
        er_riktig: {
          type: "boolean",
          description: "True hvis setningene er like (ignorer tegnsetting), false hvis forskjellige"
        },
        forklaring: {
          type: "string",
          description: "Forklaring på norsk om hva som er bra eller hva som må forbedres"
        },
        forklaring_morsmaal: {
          type: "string",
          description: `Samme forklaring oversatt til ${morsmaal}`
        },
        bruker_setning: {
          type: "string",
          description: "Brukerens setning som ble sjekket"
        }
      },
      required: ["er_riktig", "forklaring", "forklaring_morsmaal", "bruker_setning"],
      additionalProperties: false
    };

    // Make API call to Azure OpenAI with structured output
    console.log('Calling Azure OpenAI with structured output...');
    const response = await azureChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Sammenlign setningene og gi tilbakemelding.` }
      ],
      temperature: 0,
      max_completion_tokens: 1000,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sentence_check",
          strict: true,
          schema: responseSchema
        }
      }
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

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      // Ensure bruker_setning is included (fallback to input if not in response)
      bruker_setning: parsedResponse.bruker_setning || sentence,
      provider: 'azure',
    });

  } catch (error) {
    // Secure logging: Only log error type and message, never full error object
    if (process.env.NODE_ENV === 'development') {
      console.error('Check sentence Azure API error:', error instanceof Error ? error.message : 'Unknown error');
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

