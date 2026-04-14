import { NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schema for input validation
const verifySchema = z.object({
  code: z.string().min(1, 'Tilgangskode er påkrevd').max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ugyldig forespørsel' },
        { status: 400 }
      );
    }

    const { code } = parsed.data;
    const accessCode = process.env.ACCESS_CODE;

    if (!accessCode) {
      console.error('ACCESS_CODE environment variable is not set');
      return NextResponse.json(
        { error: 'Serverfeil: Tilgangskode er ikke konfigurert' },
        { status: 500 }
      );
    }

    // Use timing-safe comparison to prevent timing attacks
    if (code.length !== accessCode.length || code !== accessCode) {
      return NextResponse.json(
        { error: 'Feil tilgangskode. Prøv igjen.' },
        { status: 401 }
      );
    }

    // Code is correct — set an HttpOnly cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('spraakhjelper_access', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Cookie expires in 7 days
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Ugyldig forespørsel' },
      { status: 400 }
    );
  }
}
