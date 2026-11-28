import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers';
import { getInstruction } from '@/lib/ai/instruction-store';
import { azureChatCompletion, isAzureConfigured } from '@/lib/ai/azure';
import { SETNINGSDELING_SVARSKJEMA, type DeltSetning } from '@/lib/setningsdeling/skjema';

// Input validation schema
const splitSentencesSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long (max 5000 characters)'),
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
    const { text, morsmaal } = splitSentencesSchema.parse(body);

    console.log('Splitting sentences for language:', morsmaal);

    // Build system prompt for sentence splitting from the active instruction
    // version (or the default)
    const systemPrompt = await getInstruction('skrivehjelp_setningsdeling');

    // Make API call to Azure OpenAI with structured output. The instruction is
    // the system message and the student's text is sent alone as the user
    // message, so the text cannot easily override the instruction. No prefix
    // such as «Tekst: »: the model copied it into the first sentence.
    console.log('Calling Azure OpenAI with structured output...');
    const response = await azureChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0,
      max_completion_tokens: 4000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sentence_split',
          strict: true,
          schema: SETNINGSDELING_SVARSKJEMA
        }
      }
    }, 'skrivehjelp-setningsdeling');

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

    console.log('Received response from Azure OpenAI');

    // Parse JSON response - guaranteed valid by JSON Schema
    const parsedResponse: { sentences?: DeltSetning[] } = JSON.parse(aiResponse);
    const sentences = parsedResponse.sentences ?? [];

    return NextResponse.json({
      success: true,
      sentences,
      sentenceCount: sentences.length,
      morsmaal,
      originalText: text,
      provider: 'azure',
    });

  } catch (error) {
    // Secure logging: Only log error type and message, never full error object
    if (process.env.NODE_ENV === 'development') {
      console.error('Split sentences Azure API error:', error instanceof Error ? error.message : 'Unknown error');
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

