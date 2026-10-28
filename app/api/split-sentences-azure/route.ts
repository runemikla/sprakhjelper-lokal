import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, validateResponseSize } from '@/lib/api-helpers';
import { getInstruction } from '@/lib/ai/instruction-store';
import { azureChatCompletion, isAzureConfigured } from '@/lib/ai/azure';

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

    // Make API call to Azure OpenAI
    console.log('Calling Azure OpenAI...');
    const response = await azureChatCompletion({
      messages: [
        { role: 'user', content: `${systemPrompt}\n\nTekst: ${text}` }
      ],
      temperature: 0,
      max_completion_tokens: 4000,
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

    console.log('Received response from Azure OpenAI');

    // Parse JSON response from AI
    let parsedResponse;
    try {
      const cleanedResponse = aiResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Secure logging: Only log error message, never full error object
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to parse AI response as JSON');
      }
      throw new Error('Invalid JSON response from AI model');
    }

    // Validate that the response is an array
    if (!Array.isArray(parsedResponse)) {
      throw new Error('AI response is not an array of sentence objects');
    }

    return NextResponse.json({
      success: true,
      sentences: parsedResponse,
      sentenceCount: parsedResponse.length,
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

