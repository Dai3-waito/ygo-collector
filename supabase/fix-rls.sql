-- SQL Editor で1回だけ実行（anon からの読み書きを許可・開発用）

alter table user_cards enable row level security;

drop policy if exists "Allow all for now (dev only)" on user_cards;

create policy "Allow all for now (dev only)"
on user_cards
for all
to anon, authenticated
using (true)
with check (true);
