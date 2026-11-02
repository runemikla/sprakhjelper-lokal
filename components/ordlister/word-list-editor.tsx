'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardList, ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ListeningPageShell } from '@/components/lytteoving/page-shell'
import { LanguagePicker } from '@/components/ordlister/language-picker'
import { groupStore, wordListStore } from '@/lib/ordlister/db-store'
import { isItemReady, type Group, type WordList, type WordListItem } from '@/lib/ordlister/types'
import { generateList, imagesAvailable, type ItemStatus } from '@/lib/ordlister/generate'
import { GenerationPanel } from '@/components/ordlister/generation-panel'
import { ItemThumb } from '@/components/ordlister/item-thumb'

const MAX_DESCRIPTION = 300

interface WordListEditorProps {
  // Undefined for a new list.
  listId?: string
  userEmail?: string | null
  isAdmin?: boolean
}

function newItem(word = '', imageDescription = ''): WordListItem {
  return { id: crypto.randomUUID(), word, imageDescription }
}

export function WordListEditor({ listId, userEmail = null, isAdmin = false }: WordListEditorProps) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(!listId)
  const [notFound, setNotFound] = useState(false)
  const [saved, setSaved] = useState<WordList | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const [title, setTitle] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [words, setWords] = useState<WordListItem[]>([])
  // Groups the list is shared with, and the teacher's groups to pick from.
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [openDescriptions, setOpenDescriptions] = useState<Set<string>>(new Set())

  const [newWord, setNewWord] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const newWordRef = useRef<HTMLInputElement>(null)

  const [imagesOn, setImagesOn] = useState(true)
  const [running, setRunning] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, { status: ItemStatus; error?: string }>>({})
  const autoStarted = useRef(false)

  useEffect(() => {
    void imagesAvailable().then(setImagesOn)
    void groupStore
      .list()
      .then((all) => setGroups(all.filter((g) => g.isOwner || g.accessCode !== null)))
      .catch(() => setGroups([]))
  }, [])

  async function runGeneration(list: WordList) {
    if (running) return
    setRunning(true)
    setStatuses({})
    try {
      const withImages = await imagesAvailable()
      setImagesOn(withImages)
      await generateList(list, {
        withImages,
        onStatus: (id, status, error) =>
          setStatuses((current) => ({ ...current, [id]: { status, error } })),
        onList: (updated) => {
          setSaved(updated)
          setWords((current) =>
            current.map((w) => {
              const fresh = updated.words.find((u) => u.id === w.id)
              return fresh ? { ...w, content: fresh.content, media: fresh.media } : w
            })
          )
        },
      })
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    if (!saved || autoStarted.current) return
    if (new URLSearchParams(globalThis.location.search).has('generer')) {
      autoStarted.current = true
      globalThis.history.replaceState(null, '', `/laer-ord/${saved.id}/rediger`)
      void runGeneration(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  useEffect(() => {
    if (!listId) return
    let cancelled = false
    wordListStore
      .get(listId)
      .then((list) => {
        if (cancelled) return
        if (!list) {
          setNotFound(true)
        } else {
          setSaved(list)
          setTitle(list.title)
          setLanguages(list.languages)
          setWords(list.words)
          setGroupIds(list.groupIds)
          setOpenDescriptions(new Set(list.words.filter((w) => w.imageDescription).map((w) => w.id)))
          setJustSaved(new URLSearchParams(globalThis.location.search).has('generer'))
        }
        setLoaded(true)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setErrors([e instanceof Error ? e.message : 'Kunne ikke hente ordlisten.'])
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [listId])

  function toggleGroup(id: string) {
    setGroupIds((current) => (current.includes(id) ? current.filter((g) => g !== id) : [...current, id]))
  }

  function addWord() {
    const word = newWord.trim()
    if (!word) return
    setWords((current) => [...current, newItem(word)])
    setNewWord('')
    newWordRef.current?.focus()
  }

  function addBulk() {
    const existing = new Set(words.map((w) => w.word.toLowerCase()))
    const items = bulkText
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w && !existing.has(w.toLowerCase()))
    setWords((current) => [...current, ...[...new Set(items)].map((w) => newItem(w))])
    setBulkText('')
    setShowBulk(false)
  }

  function updateWord(id: string, patch: Partial<WordListItem>) {
    setWords((current) => current.map((w) => (w.id === id ? { ...w, ...patch } : w)))
  }

  function removeWord(id: string) {
    setWords((current) => current.filter((w) => w.id !== id))
  }

  function toggleDescription(id: string) {
    setOpenDescriptions((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSave() {
    const cleaned = words
      .map((w) => ({ ...w, word: w.word.trim(), imageDescription: w.imageDescription.trim() }))
      .filter((w) => w.word)
    const problems: string[] = []
    if (!title.trim()) problems.push('Gi ordlisten et navn.')
    if (languages.length === 0) problems.push('Velg minst ett morsmål.')
    if (cleaned.length === 0) problems.push('Legg til minst ett ord.')
    setErrors(problems)
    if (problems.length > 0) return

    setSaving(true)
    let result: WordList
    try {
      result = await wordListStore.save({
        id: saved?.id,
        title: title.trim(),
        languages,
        words: cleaned,
        groupIds,
      })
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Kunne ikke lagre ordlisten.'])
      setSaving(false)
      return
    }
    setSaving(false)
    if (!saved) {
      router.push(`/laer-ord/${result.id}/rediger?generer=1`)
      return
    }
    setSaved(result)
    setWords(cleaned)
    setJustSaved(true)
    globalThis.scrollTo({ top: 0, behavior: 'smooth' })
    void runGeneration(result)
  }

  const card = 'bg-white/95 backdrop-blur-sm border-white/20 shadow-xl'

  if (!loaded) {
    return (
      <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
        <Card className={card}>
          <CardContent className="flex items-center justify-center gap-3 py-16 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Laster ordlisten …
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  if (notFound) {
    return (
      <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
        <Card className={card}>
          <CardContent className="space-y-4 pt-6">
            <p className="text-gray-700">Fant ikke ordlisten. Den kan være slettet.</p>
            <Button asChild variant="outline">
              <Link href="/laer-ord">Tilbake til ordlistene</Link>
            </Button>
          </CardContent>
        </Card>
      </ListeningPageShell>
    )
  }

  return (
    <ListeningPageShell userEmail={userEmail} isAdmin={isAdmin}>
      <div>
        <Link
          href="/laer-ord"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Alle ordlister
        </Link>
        <h1 className="text-3xl font-bold text-white drop-shadow">
          {saved ? 'Rediger ordliste' : 'Lag ny ordliste'}
        </h1>
        <p className="mt-1 text-white/90 drop-shadow">
          Velg elevenes morsmål, skriv inn ordene og velg hvilke grupper som skal se listen. Når du
          lagrer, lager KI bilde, lyd, setning og oversettelse til hvert ord. Beskrivelsen hjelper
          KI-en å lage bildet slik du vil ha det.
        </p>
      </div>

      {saved && (
        <Card className={card}>
          <CardContent className="space-y-3 pt-6">
            {justSaved && (
              <p className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
                Ordlisten er lagret.
              </p>
            )}
            <GenerationPanel
              list={saved}
              running={running}
              statuses={statuses}
              imagesOn={imagesOn}
              readyCount={saved.words.filter((w) => isItemReady(w, saved.languages, imagesOn)).length}
              onStart={() => void runGeneration(saved)}
            />
          </CardContent>
        </Card>
      )}

      <Card className={card}>
        <CardContent className="space-y-8 pt-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold text-gray-900">
              Navn på ordlisten
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="For eksempel «Frukt og grønnsaker»"
              className="h-11 bg-white text-base"
            />
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold text-gray-900">Elevenes morsmål</p>
            <p className="text-sm text-gray-600">
              Velg ett eller flere språk. Ordene oversettes til disse språkene.
            </p>
            <LanguagePicker value={languages} onChange={setLanguages} />
          </div>

          <div className="space-y-2">
            <p className="text-base font-semibold text-gray-900">Del med grupper</p>
            <p className="text-sm text-gray-600">
              Elevene i gruppene du velger, ser ordlisten i Lær ord.{' '}
              <Link href="/grupper" className="font-medium text-blue-700 hover:underline">
                Lag og administrer grupper
              </Link>
            </p>
            {groups === null ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Henter gruppene dine …
              </p>
            ) : groups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-sm text-gray-600">
                Du har ingen grupper ennå. Du kan lagre listen nå og dele den senere.
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
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white text-gray-800 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleGroup(group.id)}
                      />
                      {group.name}
                      <span className={checked ? 'text-white/80' : 'text-gray-500'}>
                        ({group.memberCount})
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-base font-semibold text-gray-900">Ord</p>
              <span className="text-sm tabular-nums text-gray-500">
                {words.length} ord
              </span>
            </div>

            {words.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
                Ingen ord ennå. Skriv det første ordet under.
              </p>
            ) : (
              <ol className="space-y-2">
                {words.map((item, index) => {
                  const open = openDescriptions.has(item.id)
                  return (
                    <li key={item.id} className="rounded-xl border border-gray-200 bg-white px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 shrink-0 text-right text-sm tabular-nums text-gray-400">
                          {index + 1}
                        </span>
                        {saved && <ItemThumb listId={saved.id} item={item} />}
                        <Input
                          value={item.word}
                          onChange={(e) => updateWord(item.id, { word: e.target.value })}
                          aria-label={`Ord ${index + 1}`}
                          className="h-10 bg-white text-base font-medium"
                        />
                        <Button
                          type="button"
                          variant={open || item.imageDescription ? 'secondary' : 'outline'}
                          size="icon"
                          onClick={() => toggleDescription(item.id)}
                          aria-expanded={open}
                          aria-label={`Beskriv bildet for «${item.word}»`}
                          title="Beskriv bildet"
                        >
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeWord(item.id)}
                          aria-label={`Slett «${item.word}»`}
                          title="Slett ord"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {open && (
                        <div className="mt-2 pl-8">
                          <Label
                            htmlFor={`desc-${item.id}`}
                            className="text-xs font-medium text-gray-600"
                          >
                            Beskrivelse til bildet (valgfritt)
                          </Label>
                          <Textarea
                            id={`desc-${item.id}`}
                            value={item.imageDescription}
                            maxLength={MAX_DESCRIPTION}
                            onChange={(e) =>
                              updateWord(item.id, { imageDescription: e.target.value })
                            }
                            placeholder={`For eksempel: «${item.word || 'ordet'}» tegnet enkelt, på hvit bakgrunn, uten tekst`}
                            className="mt-1 min-h-[64px] bg-white text-sm"
                          />
                          <p className="mt-1 text-right text-xs tabular-nums text-gray-400">
                            {item.imageDescription.length}/{MAX_DESCRIPTION}
                          </p>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}

            <div className="flex gap-2">
              <Input
                ref={newWordRef}
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addWord()
                  }
                }}
                placeholder="Skriv et ord og trykk Enter"
                aria-label="Nytt ord"
                className="h-10 bg-white text-base"
              />
              <Button type="button" onClick={addWord} disabled={!newWord.trim()} className="h-10">
                <Plus className="h-4 w-4" /> Legg til
              </Button>
            </div>

            {showBulk ? (
              <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <Label htmlFor="bulk" className="text-sm font-medium text-gray-700">
                  Lim inn mange ord, ett per linje eller skilt med komma
                </Label>
                <Textarea
                  id="bulk"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'eple\nbanan\nappelsin'}
                  className="min-h-[120px] bg-white"
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={addBulk} disabled={!bulkText.trim()}>
                    Legg til ordene
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowBulk(false)}>
                    Avbryt
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowBulk(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
              >
                <ClipboardList className="h-4 w-4" /> Lim inn mange ord på en gang
              </button>
            )}
          </div>

          {errors.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-6">
            <Button asChild variant="outline">
              <Link href="/laer-ord">Avbryt</Link>
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || running}>
              {(saving || running) && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved ? 'Lagre og oppdater øvelsene' : 'Lagre og lag øvelser'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ListeningPageShell>
  )
}
