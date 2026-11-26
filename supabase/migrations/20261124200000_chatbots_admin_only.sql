-- migration: only admins make chatbots; every teacher can see them
-- purpose: «Snakkebot» chatbots are made and changed by admins only. teachers
--          can read all chatbots (to find the code for their students);
--          students still see the ones shared with their groups.
-- affected: policies on public.chatbots only. no data is changed.

drop policy if exists "Teachers can create chatbots" on public.chatbots;
drop policy if exists "Admins can create chatbots" on public.chatbots;
create policy "Admins can create chatbots"
on public.chatbots for insert to authenticated
with check ( (select public.is_admin()) and created_by = (select auth.uid()) );

drop policy if exists "Teachers can read all chatbots" on public.chatbots;
create policy "Teachers can read all chatbots"
on public.chatbots for select to authenticated
using ( (select public.is_teacher()) );
