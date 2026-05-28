# ygo-collector
Yu-Gi-Oh! OCG collection tracker for collectors.


遊戯王OCGコレクター向けの収集管理ツール。  
「対戦管理」ではなく、**収集・所有・コンプリート体験**に特化したWebアプリです。

---

## コンセプト

YGO Collector は、

- パック収集
- レアリティ収集
- 初版管理
- コレクション整理
- コンプ率確認

など、遊戯王OCGコレクター特有の欲求を気持ちよく管理するためのツールです。

既存のカード管理アプリが
「売買・対戦・デッキ構築」
寄りなのに対し、

YGO Collector は

> 「眺めて楽しい」
> 「埋まっていく快感」

を重視しています。

---

# 主な機能（予定含む）

## コレクション管理
- カード検索
- 所持枚数管理
- レアリティ別管理
- 初版 / 再録 / 25th 管理
- 収納場所管理

---

## コンプ率表示
- パック別コンプリート率
- レアリティ別収集率
- パック別コレクション率（別タブ・YGOPRODeck セット情報から自動取得）

---

## コレクター向け機能
- Binder管理
- Box管理
- コレクション棚UI
- Steamライブラリ風表示

---

## 今後追加予定
- Supabase連携
- クラウド同期
- 相場管理
- 画像表示
- モバイル対応
- 高度検索

---

# 技術スタック

- React
- Vite
- Tailwind CSS
- Supabase（予定）
- Vercel

---

# 開発環境

## 必要環境

- Node.js
- npm

---

# セットアップ

```bash
npm install
npm run dev
```

`.env` を `.env.example` からコピーし、Supabase の URL / anon キーを設定してください。

## マルチユーザー

- **新規登録** / **ログイン** で誰でも利用可能（Supabase Auth）
- 各ユーザーのカードは **RLS** により自分のデータだけ見える・編集できる
- **初回ログイン時はカード0枚**（自動サンプル登録なし）
- Supabase → **Authentication** → **Providers** で **Email** を有効化すること

---

# Vercel に公開

1. [GitHub](https://github.com/Dai3-waito/ygo-collector) のリポジトリを Vercel に Import
2. **Framework Preset:** Vite
3. **Environment Variables** に追加:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Supabase 側の設定（公開後必須）

**Authentication** → **URL Configuration**

- **Site URL:** `https://ygo-collector.vercel.app`
- **Redirect URLs:** `https://ygo-collector.vercel.app/**`

環境変数を追加したあと、Vercel で **Redeploy** しないと反映されません（ビルド時に埋め込まれるため）。

## Supabase — フォルダ機能（カード追加エラー時）

SQL Editor で次を実行:

```sql
alter table user_cards add column if not exists folder text default '';
```

（`supabase/migration-folder.sql` と同じ）

パスワード再設定メールのリンクが動くようにします。

## パック別コンプ率

- ヘッダーの **「コレクション率」** タブで表示（一覧タブとは分離）
- 公式の総種類数は **遊戯王ニューロン「収録」の「全○○枚」** を最優先（`/api/ygo-neuron-list`・`/api/ygo-neuron-pack`）
- レアリティ別の分母は **YGOPRODeck**（`/api/ygo-set-rarities`）を優先し、取得できないパックは **ニューロン収録**（`/api/ygo-neuron-pack-rarities`）で全レアリティを補完
- 取得できない場合は **YGOPRODeck**（セット名・型番 `LEDE` 等）と `packTotals.js` 参考値で補完
- 「公式でこのパックを確認」は収録ページ（`ope=1&pid=...`）へ直接リンク
- パック名のゆれは `src/data/packCatalog.js` で照合
