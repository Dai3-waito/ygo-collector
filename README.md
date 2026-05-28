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
- 未所持カード一覧

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

パスワード再設定メールのリンクが動くようにします。
