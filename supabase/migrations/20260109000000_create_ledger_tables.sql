-- Create ledger_users table
create table if not exists ledger_users (
  id uuid default gen_random_uuid() primary key,
  device_id text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create ledger_characters table
create table if not exists ledger_characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references ledger_users(id) on delete cascade not null,
  name text not null,
  class_name text,
  server_name text,
  is_main boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ledger_daily_records table
create table if not exists ledger_daily_records (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references ledger_characters(id) on delete cascade not null,
  date date not null,
  kina_income bigint default 0,
  count_expedition integer default 0,
  count_transcend integer default 0,
  count_bus integer default 0,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(character_id, date)
);

-- Create ledger_items (master data for autocomplete)
create table if not exists ledger_items (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ledger_record_items (items obtained)
create table if not exists ledger_record_items (
  id uuid default gen_random_uuid() primary key,
  record_id uuid references ledger_daily_records(id) on delete cascade not null,
  item_name text not null,
  count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security) - allow anonymous access for now based on device_id logic in app
alter table ledger_users enable row level security;
alter table ledger_characters enable row level security;
alter table ledger_daily_records enable row level security;
alter table ledger_record_items enable row level security;
alter table ledger_items enable row level security;

-- Policies
create policy "Public access" on ledger_users for all using (true);
create policy "Public access" on ledger_characters for all using (true);
create policy "Public access" on ledger_daily_records for all using (true);
create policy "Public access" on ledger_record_items for all using (true);
create policy "Public access" on ledger_items for all using (true);
