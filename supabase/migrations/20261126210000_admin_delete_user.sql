-- migration: let admins delete users
-- purpose: «Slett bruker» on /admin/brukere. the admin first sees what the
--          user owns (admin_user_content), the app removes the word list
--          files from storage, then admin_delete_user deletes the account.
--          everything the user made goes with it through the existing
--          on delete cascade keys: profile, groups they own (and the group
--          memberships of the students in them), their own group
--          memberships, word lists, chatbots, collections, listening
--          exercises and image log. instruction versions, ai models and
--          voices they added stay (created_by is set to null). the usage log
--          (ai_usage) has no user and is not touched.
-- affected: new functions public.admin_user_content, public.admin_delete_user
-- special: admin_delete_user deletes from auth.users. admins only; an admin
--          cannot delete themselves or another admin (change the role first).

-- ---------------------------------------------------------------------------
-- admin_user_content: what will be deleted with the user. word_list_ids is
-- used by the app to remove the files in the word-lists bucket.
-- ---------------------------------------------------------------------------
create or replace function public.admin_user_content(p_user_id uuid)
returns table (
  word_lists bigint,
  groups bigint,
  group_memberships bigint,
  chatbots bigint,
  chatbot_collections bigint,
  listening_exercises bigint,
  word_list_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    (select count(*) from public.word_lists w where w.created_by = p_user_id),
    (select count(*) from public.groups g where g.created_by = p_user_id),
    (select count(*) from public.group_members m where m.user_id = p_user_id),
    (select count(*) from public.chatbots c where c.created_by = p_user_id),
    (select count(*) from public.chatbot_collections c where c.created_by = p_user_id),
    (select count(*) from public.listening_exercises l where l.created_by = p_user_id),
    coalesce((select array_agg(w.id) from public.word_lists w where w.created_by = p_user_id), '{}'::uuid[]);
end;
$$;

revoke all on function public.admin_user_content(uuid) from public, anon;
grant execute on function public.admin_user_content(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_delete_user: deletes the account and, through the cascades,
-- everything the user made.
-- ---------------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'cannot delete yourself';
  end if;

  select coalesce(nullif(u.raw_app_meta_data ->> 'role', ''), p.role::text, 'student')
  into v_role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if not found then
    raise exception 'user not found';
  end if;
  if v_role = 'admin' then
    raise exception 'cannot delete an admin';
  end if;

  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
