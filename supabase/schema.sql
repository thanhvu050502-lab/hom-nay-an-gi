-- Hôm nay ăn gì? – cơ sở dữ liệu (Supabase / Postgres)
-- Quán, món, menu thuộc về nhóm; điểm thuộc về từng người (Spec mục 8–9).

create extension if not exists pgcrypto;

-- ---------- bảng ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'shared' check (kind in ('personal','shared')),
  invite_code text unique not null default encode(gen_random_bytes(6),'hex'),
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  name text,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  map_url text,
  source_url text,
  open_time text,
  close_time text,
  pmin int,
  pmax int,
  status text not null default 'inbox' check (status in ('inbox','active')),
  wish boolean not null default false,
  tags jsonb not null default '{}'::jsonb,
  sug jsonb,
  note text,
  list text,
  photos jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places on delete cascade,
  group_id uuid not null references public.groups on delete cascade,
  name text not null,
  price text,
  category text,
  gone boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  place_id uuid references public.places on delete set null,
  place_name text,
  at timestamptz not null default now(),
  total int,
  note text,
  with_text text,
  with_users jsonb not null default '[]'::jsonb,
  rated boolean not null default false,
  dismissed boolean not null default false,
  score numeric,
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.dish_ratings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  dish_id uuid not null references public.dishes on delete cascade,
  meal_id uuid references public.meals on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  stars int check (stars between 1 and 5),
  note text,
  photo text,
  created_at timestamptz not null default now()
);

create table if not exists public.place_ratings (
  place_id uuid not null references public.places on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  group_id uuid not null references public.groups on delete cascade,
  stars numeric,
  again text check (again in ('yes','no')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  created_by uuid references auth.users on delete set null default auth.uid(),
  filters jsonb not null default '{}'::jsonb,
  options jsonb not null default '[]'::jsonb,
  result jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.session_votes (
  session_id uuid not null references public.sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  group_id uuid not null references public.groups on delete cascade,
  name text,
  excluded jsonb not null default '[]'::jsonb,
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists places_group_idx on public.places (group_id);
create index if not exists dishes_place_idx on public.dishes (place_id);
create index if not exists meals_group_idx on public.meals (group_id);
create index if not exists dish_ratings_group_idx on public.dish_ratings (group_id);
create index if not exists place_ratings_group_idx on public.place_ratings (group_id);
create index if not exists session_votes_session_idx on public.session_votes (session_id);

-- ---------- hàm trợ giúp ----------
create or replace function public.is_member(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.members where group_id = g and user_id = auth.uid());
$$;

create or replace function public.is_admin(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.members where group_id = g and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.create_group(p_name text, p_kind text default 'shared', p_member_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.groups (name, kind, created_by) values (p_name, coalesce(p_kind,'shared'), auth.uid()) returning id into gid;
  insert into public.members (group_id, user_id, role, name) values (gid, auth.uid(), 'admin', p_member_name);
  return gid;
end $$;

create or replace function public.join_group(p_code text, p_member_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into gid from public.groups where invite_code = p_code and kind = 'shared';
  if gid is null then raise exception 'invite not found'; end if;
  insert into public.members (group_id, user_id, role, name) values (gid, auth.uid(), 'member', p_member_name)
  on conflict (group_id, user_id) do nothing;
  return gid;
end $$;

create or replace function public.group_preview(p_code text)
returns table (id uuid, name text, member_count bigint) language sql security definer stable set search_path = public as $$
  select g.id, g.name, (select count(*) from public.members m where m.group_id = g.id)
  from public.groups g where g.invite_code = p_code and g.kind = 'shared';
$$;

grant execute on function public.is_member(uuid), public.is_admin(uuid), public.create_group(text,text,text),
  public.join_group(text,text), public.group_preview(text) to authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places for each row execute function public.touch_updated_at();

-- ---------- bảo mật theo hàng ----------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.places enable row level security;
alter table public.dishes enable row level security;
alter table public.meals enable row level security;
alter table public.dish_ratings enable row level security;
alter table public.place_ratings enable row level security;
alter table public.sessions enable row level security;
alter table public.session_votes enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists groups_read on public.groups;
create policy groups_read on public.groups for select to authenticated using (public.is_member(id));
drop policy if exists groups_admin on public.groups;
create policy groups_admin on public.groups for update to authenticated using (public.is_admin(id)) with check (public.is_admin(id));
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated using (public.is_admin(id));

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated using (public.is_member(group_id));
drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists members_leave on public.members;
create policy members_leave on public.members for delete to authenticated
  using (user_id = auth.uid() or public.is_admin(group_id));

-- bảng thuộc nhóm: thành viên đọc và ghi
do $$
declare t text;
begin
  foreach t in array array['places','dishes','sessions'] loop
    execute format('drop policy if exists %1$s_member on public.%1$s', t);
    execute format('create policy %1$s_member on public.%1$s for all to authenticated using (public.is_member(group_id)) with check (public.is_member(group_id))', t);
  end loop;
end $$;

-- bảng của từng người: cả nhóm đọc, chỉ chủ sở hữu ghi
drop policy if exists meals_read on public.meals;
create policy meals_read on public.meals for select to authenticated using (public.is_member(group_id));
drop policy if exists meals_write on public.meals;
create policy meals_write on public.meals for all to authenticated
  using (created_by = auth.uid() and public.is_member(group_id)) with check (created_by = auth.uid() and public.is_member(group_id));

do $$
declare t text;
begin
  foreach t in array array['dish_ratings','place_ratings','session_votes'] loop
    execute format('drop policy if exists %1$s_read on public.%1$s', t);
    execute format('create policy %1$s_read on public.%1$s for select to authenticated using (public.is_member(group_id))', t);
    execute format('drop policy if exists %1$s_write on public.%1$s', t);
    execute format('create policy %1$s_write on public.%1$s for all to authenticated using (user_id = auth.uid() and public.is_member(group_id)) with check (user_id = auth.uid() and public.is_member(group_id))', t);
  end loop;
end $$;

-- ---------- cập nhật trực tiếp ----------
do $$
declare t text;
begin
  foreach t in array array['places','dishes','meals','dish_ratings','place_ratings','sessions','session_votes','members'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- kho ảnh ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and owner = auth.uid());

-- ---------- 2026-11-20: Google Places (gói miễn phí) và nhãn danh sách Takeout ----------
alter table public.places add column if not exists g_place_id text;
alter table public.places add column if not exists g_rating numeric;
alter table public.places add column if not exists g_count int;
alter table public.places add column if not exists g_url text;
alter table public.places add column if not exists g_at timestamptz;
create table if not exists public.search_cache (key text primary key, data jsonb not null, at timestamptz not null default now());
alter table public.search_cache enable row level security;
create table if not exists public.api_usage (month text primary key, n int not null default 0);
alter table public.api_usage enable row level security;
-- hàm use_google(p_kind) giới hạn 900 lượt/tháng (600 cho việc lấy điểm hàng loạt); google_usage() trả số lượt đã dùng
