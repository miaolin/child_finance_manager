-- Pocket money — cloud schema
--
-- Run this once in the Supabase SQL editor. It is safe to re-run: every
-- statement is guarded.
--
-- Two decisions worth knowing before reading:
--
-- 1. Ids are text, not uuid. The app already generates its own ids, and
--    category ids are readable slugs ('snacks'). Keeping them means existing
--    records upload unchanged rather than being renumbered.
--
-- 2. The primary key is (owner_id, id). Two families must both be able to have
--    a category called 'snacks' without colliding.

-- Children -----------------------------------------------------------------

create table if not exists public.children (
  owner_id    uuid        not null references auth.users on delete cascade,
  id          text        not null,
  name        text        not null,
  emoji       text        not null default '🦊',
  color       text        not null default '#f7c548',
  allowance   jsonb,
  limits      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Soft delete. A hard delete on one device would be undone by the next pull
  -- from another that had not heard about it yet.
  deleted_at  timestamptz,
  primary key (owner_id, id)
);

-- Transactions --------------------------------------------------------------

create table if not exists public.transactions (
  owner_id     uuid        not null references auth.users on delete cascade,
  id           text        not null,
  child_id     text        not null,
  -- Always positive; direction lives in kind. Whole cents only: the app never
  -- holds money as a float and neither does the database.
  amount_cents bigint      not null check (amount_cents > 0),
  kind         text        not null check (kind in ('in', 'out')),
  category_id  text        not null,
  note         text        not null default '',
  occurred_on  date        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (owner_id, id),
  foreign key (owner_id, child_id)
    references public.children (owner_id, id) on delete cascade
);

create index if not exists transactions_by_child
  on public.transactions (owner_id, child_id, occurred_on desc);

-- Categories ----------------------------------------------------------------

create table if not exists public.categories (
  owner_id    uuid        not null references auth.users on delete cascade,
  id          text        not null,
  label       text        not null,
  emoji       text        not null default '⭐',
  applies_to  text        not null check (applies_to in ('in', 'out')),
  -- Archived is the parent hiding it from the children; deleted is sync
  -- removing the row. They are not the same thing.
  archived_at timestamptz,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (owner_id, id)
);

-- Chores --------------------------------------------------------------------

create table if not exists public.chores (
  owner_id     uuid        not null references auth.users on delete cascade,
  id           text        not null,
  label        text        not null,
  emoji        text        not null default '🧹',
  payout_cents bigint      not null check (payout_cents > 0),
  archived_at  timestamptz,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  primary key (owner_id, id)
);

-- Settings ------------------------------------------------------------------
-- One row per family. The parent PIN hash lives here so the same PIN works on
-- every device, which is what a parent who set one would expect.

create table if not exists public.settings (
  owner_id    uuid        primary key references auth.users on delete cascade,
  currency    text        not null default 'SGD',
  locale      text        not null default 'en-SG',
  parent_name text        not null default 'Parent',
  parent      jsonb,
  updated_at  timestamptz not null default now()
);

-- Row-level security --------------------------------------------------------
-- Without this every signed-in user could read every family's records. It is
-- the whole security model, so it is enabled before anything else touches the
-- tables.

alter table public.children     enable row level security;
alter table public.transactions enable row level security;
alter table public.categories   enable row level security;
alter table public.chores       enable row level security;
alter table public.settings     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['children', 'transactions', 'categories', 'chores', 'settings']
  loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I
         for all
         using (owner_id = (select auth.uid()))
         with check (owner_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Keep updated_at honest ----------------------------------------------------
-- Last-write-wins is only as good as its timestamps, and a client clock cannot
-- be trusted, so the database stamps every write itself.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['children', 'transactions', 'categories', 'chores', 'settings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.touch_updated_at()',
      t
    );
  end loop;
end $$;

-- Live updates --------------------------------------------------------------
-- Without this the tables emit no change events, and a device only finds out
-- about another's edits when it next pulls. Adding them to the publication is
-- what lets a change appear on the other device by itself.

do $$
declare t text;
begin
  foreach t in array array['children', 'transactions', 'categories', 'chores', 'settings']
  loop
    -- Re-running the file must not fail, and a table cannot be added twice.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
