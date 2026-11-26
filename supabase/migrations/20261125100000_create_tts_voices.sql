-- migration: create tts voices
-- purpose: let admins choose which Google Cloud Text-to-Speech voices teachers
--          can pick in the AI tools (Lytteøving, ordlister in Lær ord,
--          Snakkebot), from the admin page /stemmer.
-- affected: new table public.tts_voices
-- special: purely additive. the table starts with the four voices the tools
--          already offer (Enceladus, Iapetus, Erinome, Callirrhoe), so applying
--          this migration changes nothing until an admin picks other voices.
--          with no rows the tools also fall back to those four.

-- ---------------------------------------------------------------------------
-- tts_voices: one row per voice teachers can choose
-- ---------------------------------------------------------------------------
-- voice_id is what the tools store: the short name for Chirp 3 HD voices
-- («Erinome»), the full Google name for others («nb-NO-Wavenet-A»).
-- see lib/tts/voices.ts.
create table if not exists public.tts_voices (
  voice_id text primary key
    check (char_length(voice_id) <= 40
      and (voice_id ~ '^[A-Z][a-z]{1,19}$'
        or voice_id ~ '^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+(-[A-Za-z0-9]+)*$')),
  google_name text not null check (char_length(google_name) between 1 and 80),
  gender text check (gender in ('kvinne', 'mann', 'nøytral')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.tts_voices is
  'Text-to-speech voices the admin has made available in the AI tools. Without rows the tools offer Enceladus, Iapetus, Erinome and Callirrhoe.';

insert into public.tts_voices (voice_id, google_name, gender) values
  ('Enceladus', 'nb-NO-Chirp3-HD-Enceladus', 'mann'),
  ('Iapetus', 'nb-NO-Chirp3-HD-Iapetus', 'mann'),
  ('Erinome', 'nb-NO-Chirp3-HD-Erinome', 'kvinne'),
  ('Callirrhoe', 'nb-NO-Chirp3-HD-Callirrhoe', 'kvinne')
on conflict (voice_id) do nothing;

-- ---------------------------------------------------------------------------
-- rls: everyone can read the list (voice names are not secret, and Snakkebot
-- by code works without login); only admins can change it
-- ---------------------------------------------------------------------------
alter table public.tts_voices enable row level security;

drop policy if exists "Anyone can read tts voices" on public.tts_voices;
create policy "Anyone can read tts voices"
on public.tts_voices
for select
to anon, authenticated
using ( true );

drop policy if exists "Admins can add tts voices" on public.tts_voices;
create policy "Admins can add tts voices"
on public.tts_voices
for insert
to authenticated
with check ( (select public.is_admin()) );

drop policy if exists "Admins can remove tts voices" on public.tts_voices;
create policy "Admins can remove tts voices"
on public.tts_voices
for delete
to authenticated
using ( (select public.is_admin()) );
