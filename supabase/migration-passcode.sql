-- コレクション画像の復旧用（任意・SQL Editor で1回）
alter table user_cards add column if not exists passcode text;
