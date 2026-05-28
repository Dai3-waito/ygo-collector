-- SQL Editor で1回実行（ログイン・カード追加削除用）
-- 事前: Supabase → Authentication → Providers → Email を有効化

alter table user_cards add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table user_cards add column if not exists name text;
alter table user_cards add column if not exists pack text;
alter table user_cards add column if not exists rarity text;
alter table user_cards add column if not exists image_url text;
alter table user_cards add column if not exists folder text default '';

alter table user_cards drop constraint if exists user_cards_card_id_key;

drop index if exists user_cards_user_card_unique;
create unique index user_cards_user_card_unique on user_cards (user_id, card_id);

alter table user_cards enable row level security;

drop policy if exists "Allow all for now (dev only)" on user_cards;
drop policy if exists "Users select own cards" on user_cards;
drop policy if exists "Users insert own cards" on user_cards;
drop policy if exists "Users update own cards" on user_cards;
drop policy if exists "Users delete own cards" on user_cards;

create policy "Users select own cards"
  on user_cards for select
  using (auth.uid() = user_id);

create policy "Users insert own cards"
  on user_cards for insert
  with check (auth.uid() = user_id);

create policy "Users update own cards"
  on user_cards for update
  using (auth.uid() = user_id);

create policy "Users delete own cards"
  on user_cards for delete
  using (auth.uid() = user_id);
