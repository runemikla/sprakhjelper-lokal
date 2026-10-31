# Ordlister: plan for databasekobling

Ordlistene (/ordlister) lagres foreløpig i nettleseren (`lib/ordlister/local-store.ts`).
Slik er planen for å flytte dem til Supabase. Ingenting her er kjørt i databasen ennå.

## Tabeller

```sql
create table public.word_lists (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  access_code text not null unique
    check (access_code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$'),
  languages text[] not null default '{}',      -- elevenes morsmål
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.word_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.word_lists(id) on delete cascade,
  position int not null,
  word text not null check (char_length(word) between 1 and 80),
  image_description text check (char_length(image_description) <= 300),
  image_path text,                -- Supabase Storage, fylles når bildet er laget
  audio_path text,                -- Google TTS, fylles når lyden er laget
  example_sentence text,
  unique (list_id, position)
);

create table public.word_list_translations (
  item_id uuid not null references public.word_list_items(id) on delete cascade,
  language text not null,
  translation text not null,
  primary key (item_id, language)
);
```

`access_code` lages av en trigger, på samme måte som `listening_exercises`
(`generate_listening_access_code`), og `updated_at` bruker `set_updated_at()`.

## Tilgang (RLS)

- Lærere (`public.is_teacher()`) kan lese, opprette, endre og slette sine egne lister
  og ord (`created_by = auth.uid()`), som for lytteøvingene.
- Elever trenger ikke konto. De får ikke lese tabellene direkte. I stedet finnes en
  `security definer`-funksjon `get_word_list_by_code(code text)` som gir tilbake én liste
  med ord og oversettelser bare når koden er riktig. Den gis til `anon` og `authenticated`.
  Da kan ingen liste opp alle ordlister ved å gjette.

## Redigering

Lagring går via en `save_word_list(...)`-funksjon (eller en API-rute) som oppdaterer
listen og erstatter ordene i én transaksjon. Ord som er uendret, beholder bilde, lyd og
oversettelse. Nye ord og ord med endret beskrivelse får nye bilder.

## Bilder, lyd og oversettelse

Når en lærer lagrer, lager en API-rute det som mangler for hvert ord:
oversettelse til de valgte morsmålene (Azure OpenAI), bilde ut fra ordet og
beskrivelsen (bildemodell i Azure AI Foundry), og lyd (Google TTS). Filene legges i en
Storage-bøtte `word-lists`. Elevvisningen bruker så de samme øvelsene som Lær ord.
