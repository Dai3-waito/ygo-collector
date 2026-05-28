-- フォルダ仕分け用（SQL Editor で1回実行）
alter table user_cards add column if not exists folder text default '';
