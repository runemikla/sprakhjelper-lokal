'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/landing/page-header'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { VoicePicker } from '@/components/ordlister/voice-picker'
import { groupStore } from '@/lib/ordlister/db-store'
import type { Group } from '@/lib/ordlister/types'
import { chatbotStore } from '@/lib/snakkebot/db-store'
import { CHATBOT_LEVELS, LEVEL_LABELS, LIMITS, type Chatbot, type ChatbotLevel } from '@/lib/snakkebot/types'
import { DEFAULT_CHOSEN_VOICE } from '@/lib/tts/gemini-voices'

// Ready-made instructions the teacher can start from and change.
const EXAMPLES: { label: string; name: string; description: string; instructions: string }[] = [
  {
    label: 'Kafé',
    name: 'På kafeen',
    description: 'Bestill mat og drikke på en kafé.',
    instructions:
      'Du jobber i kassen på en kafé i Bergen. Eleven er kunde og skal bestille mat og drikke. Spør hva eleven vil ha, om det skal være noe mer, om eleven vil spise her eller ta med, og si hva det koster. Bruk vanlige ord som kaffe, te, bolle, smørbrød og kvittering.',
  },
  {
    label: 'Legetime',
    name: 'Hos legen',
    description: 'Fortell legen hva som er galt.',
    instructions:
      'Du er fastlege. Eleven kommer til en legetime. Spør hva som er problemet, hvor det gjør vondt, hvor lenge eleven har vært syk, og gi et enkelt råd. Øv på kroppsdeler og ord som feber, hoste, vondt og resept. Ikke gi ekte medisinske råd utover det helt enkle.',
  },
  {
    label: 'Jobbintervju',
    name: 'Jobbintervju',
    description: 'Øv på å svare i et jobbintervju.',
    instructions:
      'Du er daglig leder i en butikk og har et jobbintervju med eleven. Still ett spørsmål om gangen: om erfaring, hva eleven er god til, hvorfor eleven vil ha jobben og når eleven kan begynne. Gi til slutt eleven en kort og vennlig tilbakemelding på hvordan intervjuet gikk.',
  },
  {
    label: 'Bli kjent',
    name: 'Bli kjent',
    description: 'Fortell om deg selv og still spørsmål.',
    instructions:
      'Du er en ny klassekamerat som vil bli kjent med eleven. Snakk om hvor dere kommer fra, familie, fritid, mat og hva dere liker å gjøre. Fortell litt om deg selv også, og still spørsmål tilbake.',
  },
]

interface ChatbotEditorProps {
  userEmail: string | null
  isAdmin: boolean
  chatbotId?: string
}

export function ChatbotEditor({ userEmail, isAdmin, chatbotId }: ChatbotEditorProps) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(!chatbotId)
  const [missing, setMissing] = useState(false)
  const [saved, setSaved] = useState<Chatbot | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [greeting, setGreeting] = useState('')
  const [level, setLevel] = useState<ChatbotLevel | ''>('A2')
  const [voice, setVoice] = useState<string>(DEFAULT_CHOSEN_VOICE)
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void groupStore
      .list()
      .then((all) => setGroups(all.filter((g) => g.isOwner || g.accessCode !== null)))
      .catch(() => setGroups([]))
  }, [])

  useEffect(() => {
    if (!chatbotId) return
    let cancelled = false
    chatbotStore
      .get(chatbotId)
      .then((bot) => {
        if (cancelled) return
        if (!bot) {
          setMissing(true)
        } else {
          setSaved(bot)
          setName(bot.name)
          setDescription(bot.description)
          setInstructions(bot.instructions)
          setGreeting(bot.greeting)
          setLevel(bot.level ?? '')
          setVoice(bot.voice)
          setGroupIds(bot.groupIds)
        }
      })
      .catch(() => !cancelled && setMissing(true))
      .finally(() => !cancelled && setLoaded(true))
    return () => {
      cancelled = true
    }
  }, [chatbotId])

  function applyExample(example: (typeof EXAMPLES)[number]) {
    if (instructions.trim() && !window.confirm('Vil du bytte ut instruksen med eksempelet?')) return
    setInstructions(example.instructions)
    if (!name.trim()) setName(example.name)
    if (!description.trim()) setDescription(example.description)
  }

  function toggleGroup(id: string) {
    setGroupIds((current) => (current.includes(id) ? current.filter((g) => g !== id) : [...current, id]))
  }

  async function handleSave(openAfter: boolean) {
    if (!name.trim()) return setError('Gi snakkeboten et navn.')
    if (!instructions.trim()) return setError('Skriv en instruks, eller velg et eksempel.')
    setError(null)
    setSaving(true)
    try {
      const id = await chatbotStore.save({
        id: saved?.id,
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        greeting: greeting.trim(),
        voice,
        level: level || null,
        groupIds,
      })
      router.push(openAfter ? `/snakkebot/${id}` : '/snakkebot')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lagre snakkeboten.')
      setSaving(false)
    }
  }

  const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

  if (!loaded || missing) {
    return (
      <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
        <Card className={card}>
          <CardContent className="flex items-center justify-center gap-3 py-16 text-gray-500">
            {missing ? (
              <span>Fant ikke snakkeboten. Den kan være slettet.</span>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Laster snakkeboten …
              </>
            )}
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <PageHeader
        backHref="/snakkebot"
        backLabel="Alle snakkeboter"
        title={saved ? 'Rediger snakkebot' : 'Lag ny snakkebot'}
        description="Skriv hvem snakkeboten er og hva elevene skal øve på. Svarene leses opp med stemmen du velger."
      />

      <Card className={card}>
        <CardContent className="space-y-6 pt-6">
          {saved && (
            <p className="rounded-xl border border-gray-200 bg-vlfk-surface-muted px-4 py-3 text-sm text-gray-700">
              Elevene kan åpne snakkeboten med koden{' '}
              <span className="font-mono text-base font-bold tracking-[0.25em] text-gray-900">{saved.accessCode}</span>{' '}
              på Snakkebot-siden, uten å logge inn.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="bot-name" className="text-base font-semibold text-gray-900">
              Navn
            </Label>
            <Input
              id="bot-name"
              value={name}
              maxLength={LIMITS.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="For eksempel «På kafeen»"
              className="bg-white text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-description" className="text-base font-semibold text-gray-900">
              Kort beskrivelse til elevene <span className="font-normal text-gray-500">(valgfri)</span>
            </Label>
            <Input
              id="bot-description"
              value={description}
              maxLength={LIMITS.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="For eksempel «Bestill mat og drikke på en kafé.»"
              className="bg-white text-base md:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-instructions" className="text-base font-semibold text-gray-900">
              Instruks
            </Label>
            <p className="text-sm text-gray-600">
              Hvem er snakkeboten, hva skal samtalen handle om, og hva skal eleven øve på? Elevene ser ikke instruksen.
              Snakkeboten svarer alltid kort og på bokmål.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="self-center text-sm text-gray-500">Eksempler:</span>
              {EXAMPLES.map((example) => (
                <Button key={example.label} type="button" variant="outline" size="sm" onClick={() => applyExample(example)}>
                  {example.label}
                </Button>
              ))}
            </div>
            <Textarea
              id="bot-instructions"
              value={instructions}
              maxLength={LIMITS.instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="For eksempel: Du jobber i kassen på en kafé. Eleven er kunde og skal bestille mat og drikke …"
              className="min-h-[160px] bg-white text-base md:text-sm"
            />
            <p className="text-right text-xs tabular-nums text-gray-400">
              {instructions.length}/{LIMITS.instructions}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bot-greeting" className="text-base font-semibold text-gray-900">
              Første melding <span className="font-normal text-gray-500">(valgfri)</span>
            </Label>
            <p className="text-sm text-gray-600">Det snakkeboten sier først. Står feltet tomt, finner snakkeboten på en hilsen selv.</p>
            <Input
              id="bot-greeting"
              value={greeting}
              maxLength={LIMITS.greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="For eksempel «Hei, velkommen! Hva vil du ha i dag?»"
              className="bg-white text-base md:text-sm"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-base font-semibold text-gray-900">Nivå</p>
              <Select value={level || 'ingen'} onValueChange={(v) => setLevel(v === 'ingen' ? '' : (v as ChatbotLevel))}>
                <SelectTrigger aria-label="Nivå" className="h-10 w-full max-w-md bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHATBOT_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </SelectItem>
                  ))}
                  <SelectItem value="ingen">Tilpass til eleven</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Styrer hvor enkelt snakkeboten snakker, og hvor fort den leser.</p>
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold text-gray-900">Stemme</p>
              <VoicePicker
                value={voice}
                onChange={setVoice}
                provider="google"
                sample={greeting.trim() || 'Hei! Så hyggelig å snakke med deg. Hva har du gjort i dag?'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold text-gray-900">Del med grupper</p>
            <p className="text-sm text-gray-600">
              Elevene i gruppene du velger, finner snakkeboten på Snakkebot-siden når de er logget inn. Alle med koden kan
              også åpne den.{' '}
              <Link href="/grupper" className="font-medium text-vlfk-ink hover:underline">
                Lag og administrer grupper
              </Link>
            </p>
            {groups === null ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Henter gruppene dine …
              </p>
            ) : groups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600">
                Du har ingen grupper ennå. Elevene kan bruke koden i stedet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => {
                  const checked = groupIds.includes(group.id)
                  return (
                    <label
                      key={group.id}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                        checked
                          ? 'border-vlfk-ink bg-vlfk-ink text-white'
                          : 'border-gray-300 bg-white text-gray-800 hover:border-vlfk-ink'
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleGroup(group.id)} />
                      {group.name}
                      <span className={checked ? 'text-white/80' : 'text-gray-500'}>({group.memberCount})</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-5">
            <Button type="button" onClick={() => void handleSave(true)} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lagre og prøv
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleSave(false)} disabled={saving}>
              Lagre
            </Button>
          </div>
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
