'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function TilgangPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Feil tilgangskode. Prøv igjen.');
      }
    } catch {
      setError('Noe gikk galt. Prøv igjen senere.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Background Image with Overlay — same as front page */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/Aurlandsfjorden-blaa.jpg"
          alt="Aurlandsfjorden bakgrunn"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/70 via-blue-800/60 to-cyan-700/50" />
        <div className="absolute bottom-4 right-4 text-white/70 text-xs bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded">
          Foto: Silje Alvsaker / Vestland fylkeskommune
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-3 pb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Språkhjelp
            </h1>
            <CardDescription className="text-base">
              Skriv inn tilgangskoden for å bruke appen
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="access-code" className="text-sm font-medium">
                  Tilgangskode
                </Label>
                <Input
                  id="access-code"
                  type="password"
                  placeholder="Skriv inn tilgangskoden..."
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError('');
                  }}
                  disabled={isLoading}
                  autoFocus
                  autoComplete="off"
                  className="h-11 text-base"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-md p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading || !code.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifiserer...
                  </>
                ) : (
                  'Gå videre'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
