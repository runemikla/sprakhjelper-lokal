import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Noe gikk galt</CardTitle>
      </CardHeader>
      <CardContent>
        {params?.error ? (
          <p className="text-sm text-muted-foreground">{params.error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">En ukjent feil oppstod.</p>
        )}
      </CardContent>
    </Card>
  )
}
