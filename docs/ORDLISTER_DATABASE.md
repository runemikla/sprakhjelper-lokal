# Grupper og ordlister i databasen

Ordlistene i «Lær ord» lagres i Supabase og deles med elever gjennom grupper.
Migrasjonen ligger i `supabase/migrations/20261102100000_create_groups_and_word_lists.sql`
og er rent additiv (ingen eksisterende tabeller endres).

## Slik henger det sammen

- **Grupper** (`/grupper`): En lærer (eller admin) lager en gruppe og får en
  tilgangskode på seks tegn. Elever logger inn, skriver inn koden på samme side og
  blir medlem. Eieren og admin ser koden og medlemmene og kan fjerne medlemmer eller
  slette gruppen. Admin ser alle grupper.
- **Lær ord** (`/laer-ord`): Krever innlogging. Lærere ser sine egne ordlister og
  «Lag ny». Elever ser ordlistene som er delt med gruppene de er med i. Begge ser
  de faste temaene. Admin har samme rettigheter som lærer, og ser i tillegg alle
  ordlister.
- Når læreren lagrer en ordliste, velger hen hvilke grupper listen deles med.
  Gammel deling med firetegnskode og `/ordlister` finnes ikke lenger;
  `/ordlister/...` sender videre til `/laer-ord`.

## Tabeller

| Tabell | Innhold |
| --- | --- |
| `groups` | Navn, `access_code` (6 tegn, lages av trigger), `created_by` |
| `group_members` | Hvem som er med i hvilken gruppe (fylles av `join_group`) |
| `word_lists` | Tittel, morsmål (`languages`), `created_by` |
| `word_list_items` | Ordene: `word`, `image_description`, `content` (jsonb: bøyning, engelsk, oversettelser, setning, motiv), `media` (jsonb: hvilken versjon av bilde/lyd som er lagret) |
| `word_list_groups` | Hvilke grupper en ordliste er delt med |

Filer (bilde `-img.webp`, ordet `-w.mp3`, setningen `-s.mp3`) ligger i Storage-bøtta
`word-lists` under `<liste-id>/<ord-id>-<type>.<ext>`. Bøtta er offentlig lesbar, så
Lær ord kan spille av direkte; bare eieren og admin kan skrive til den.

## Funksjoner

- `join_group(code)`: innlogget bruker blir medlem; returnerer gruppen eller ingenting.
- `list_my_groups()`: gruppene brukeren eier eller er med i (admin: alle). Koden og
  eierens e-post vises bare for eier og admin.
- `get_group_members(group_id)`: medlemmenes e-post, for eier og admin.
- `save_word_list(id, title, languages, items, group_ids)`: lagrer liste, ord og
  deling i én transaksjon (security invoker, så RLS gjelder).
- Hjelpere for RLS: `is_group_owner`, `is_group_member`, `can_manage_word_list`,
  `can_read_word_list`, `can_manage_word_list_file`.

## Tilgang (RLS)

- Lærere kan lage grupper og ordlister. Eier og admin kan endre og slette.
- Elever ser gruppene de er med i, og ordlister (med ord) som er delt med disse
  gruppene. De kan melde seg ut av en gruppe.
- En ordliste kan bare deles med grupper læreren selv eier (admin: alle).

## Generering av innhold

Som før: `/api/ordlister/innhold` (språkmodell), `/api/ordlister/lyd` (Google TTS) og
`/api/ordlister/bilde` (Gemini) kalles fra nettleseren i `lib/ordlister/generate.ts`.
Tekst lagres rett i `word_list_items.content`, filer lastes opp til bøtta, og
`media` oppdateres når hver fil er på plass. Bare nye eller endrede ord lages på nytt.
