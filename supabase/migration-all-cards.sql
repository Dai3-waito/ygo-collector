-- 未所持カード一覧用マスタ（全カードカタログ）
-- Supabase → SQL Editor で1回実行

create table if not exists all_cards (
  card_id text primary key,
  name text not null,
  pack text not null,
  rarity text,
  image_url text,
  collection_type text default '初版'
);

alter table all_cards enable row level security;

drop policy if exists "Authenticated read all_cards" on all_cards;
create policy "Authenticated read all_cards"
  on all_cards for select
  to authenticated
  using (true);

-- 所持データの見方（このアプリでは user_cards = owned_cards）
-- owned > 0 の行が「所持中」
create or replace view owned_cards as
  select
    user_id,
    card_id,
    name,
    pack,
    rarity,
    image_url,
    owned,
    location,
    collection_type,
    folder,
    updated_at
  from user_cards
  where coalesce(owned, 0) > 0;

-- 初期データ（src/data/cards.js と同じ10枚。追記は INSERT で）
insert into all_cards (card_id, name, pack, rarity, image_url, collection_type) values
  ('QCCU-JP001', '青眼の白龍', 'QUARTER CENTURY CHRONICLE side:UNITY', '25thシークレットレア', '/cards/QCCU-JP001.jpg', '25th'),
  ('QCCU-JP002', 'ブラック・マジシャン', 'QUARTER CENTURY CHRONICLE side:UNITY', 'シークレットレア', '/cards/QCCU-JP002.jpg', '初版'),
  ('QCDB-JP001', '青眼の亜白龍', 'QUARTER CENTURY DUELIST BOX', 'ウルトラレア', '/cards/QCDB-JP001.jpg', '再録'),
  ('LEDE-JP045', '灰流うらら', 'LEGACY OF DESTRUCTION', 'プリズマティックシークレットレア', '/cards/LEDE-JP045.jpg', '初版'),
  ('MACR-JP037', '灰流うらら', 'マキシマム・クライシス', 'スーパーレア', '/cards/MACR-JP037.jpg', '再録'),
  ('RC04-JP001', '強欲で貪欲な壺', 'RARITY COLLECTION -QUARTER CENTURY EDITION-', 'コレクターズレア', '/cards/RC04-JP001.jpg', '再録'),
  ('TDPP-JP019', '閃刀姫－レイ', 'デュエリストパック－レジェンドデュエリスト編6－', 'シークレットレア', '/cards/TDPP-JP019.jpg', '初版'),
  ('DANE-JP020', '増殖するG', 'DARK NEOSTORM', 'スーパーレア', '/cards/DANE-JP020.jpg', '再録'),
  ('WPP4-JP001', 'マジシャンズ・ソウルズ', 'WORLD PREMIERE PACK 2023', 'シークレットレア', '/cards/WPP4-JP001.jpg', '25th'),
  ('P5-01', 'ブラック・マジシャン・ガール', '劇場版 前売り特典', 'シークレットレア', '/cards/P5-01.jpg', '初版')
on conflict (card_id) do update set
  name = excluded.name,
  pack = excluded.pack,
  rarity = excluded.rarity,
  image_url = excluded.image_url,
  collection_type = excluded.collection_type;
