-- has_role is used by RLS policies with auth.uid(). Prevent direct RPC
-- callers from probing the role of arbitrary account IDs.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select _user_id = auth.uid()
     and exists (
       select 1
       from public.user_roles
       where user_id = auth.uid()
         and role = _role
     )
$function$;
