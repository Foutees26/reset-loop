-- Supabase schema for Reset Loop

create table if not exists users_profile (
  id uuid primary key,
  display_name text not null,
  reminder_time text,
  created_at timestamp with time zone default now() not null
);

create table if not exists reset_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) not null,
  task_text text not null,
  energy_level text not null,
  completed_at timestamp with time zone not null,
  used_freeze boolean not null default false
);

create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) not null,
  mood text not null,
  energy text not null,
  pain text not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists custom_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users_profile(id) not null,
  task_text text not null,
  energy_level text not null,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_reset_logs_user_id on reset_logs(user_id);
create index if not exists idx_check_ins_user_id on check_ins(user_id);
create index if not exists idx_custom_tasks_user_id on custom_tasks(user_id);

alter table users_profile enable row level security;
alter table reset_logs enable row level security;
alter table check_ins enable row level security;
alter table custom_tasks enable row level security;

drop policy if exists "anon can read profiles" on users_profile;
drop policy if exists "anon can create profiles" on users_profile;
drop policy if exists "anon can update profiles" on users_profile;
drop policy if exists "anon can read reset logs" on reset_logs;
drop policy if exists "anon can create reset logs" on reset_logs;
drop policy if exists "anon can read check ins" on check_ins;
drop policy if exists "anon can create check ins" on check_ins;
drop policy if exists "anon can read custom tasks" on custom_tasks;
drop policy if exists "anon can create custom tasks" on custom_tasks;
drop policy if exists "anon can delete custom tasks" on custom_tasks;

create policy "anon can read profiles"
  on users_profile for select
  to anon
  using (true);

create policy "anon can create profiles"
  on users_profile for insert
  to anon
  with check (true);

create policy "anon can update profiles"
  on users_profile for update
  to anon
  using (true)
  with check (true);

create policy "anon can read reset logs"
  on reset_logs for select
  to anon
  using (true);

create policy "anon can create reset logs"
  on reset_logs for insert
  to anon
  with check (true);

create policy "anon can read check ins"
  on check_ins for select
  to anon
  using (true);

create policy "anon can create check ins"
  on check_ins for insert
  to anon
  with check (true);

create policy "anon can read custom tasks"
  on custom_tasks for select
  to anon
  using (true);

create policy "anon can create custom tasks"
  on custom_tasks for insert
  to anon
  with check (true);

create policy "anon can delete custom tasks"
  on custom_tasks for delete
  to anon
  using (true);
