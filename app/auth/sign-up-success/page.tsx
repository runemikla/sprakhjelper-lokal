import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'

export default function Page() {
  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Sjekk e-posten din</CardTitle>
        <CardDescription>Bekreft kontoen før du logger inn</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Du er registrert. Åpne e-posten din og klikk på bekreftelseslenken
          før du logger inn.
        </p>
        <Link
          href="/auth/login"
          className="text-sm font-medium underline underline-offset-4"
        >
          Tilbake til innlogging
        </Link>
      </CardContent>
    </Card>
  )
}
