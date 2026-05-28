-- SQL でエラーが出るとき用（いちばん簡単・開発用）
-- 注意: 本番公開前には必ず見直してください

alter table user_cards disable row level security;
