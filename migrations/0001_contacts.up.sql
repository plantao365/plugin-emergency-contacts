-- Roda no schema plugin_emergency_contacts (search_path do kernel).
create table contacts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  name text not null,
  phone text not null,
  role text not null default '',
  notes text not null default '',
  needs_review boolean not null default false,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contacts_team_idx on contacts (team_id, name);
