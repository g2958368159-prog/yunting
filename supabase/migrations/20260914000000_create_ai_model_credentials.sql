-- Stores only server-encrypted API keys. There are intentionally no client RLS
-- policies: credentials are read and written exclusively by authenticated API routes.
create table if not exists public.ai_model_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  base_url text not null,
  model text not null,
  encrypted_api_key text not null,
  encryption_iv text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_model_credentials enable row level security;
