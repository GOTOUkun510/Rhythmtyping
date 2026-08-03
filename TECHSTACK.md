# 技術スタック メモ（RhythmTyping）

## ベース
- Next.js 16.2.12（App Router）
- React 19.2.4 / React DOM 19.2.4
- TypeScript 5系
- Tailwind CSS 4系（@tailwindcss/postcss）
- ESLint 9系 + eslint-config-next

## Next.js 16 の注意点（node_modules/next/dist/docs 参照済み）
- 従来の Next.js の知識と異なる破壊的変更がある可能性があるため、実装前に
  node_modules/next/dist/docs/01-app 配下の該当ドキュメントを都度参照する
- app/ 配下はファイルベースルーティング。page.tsx / layout.tsx の規約は維持
- params / searchParams は Promise 型（await が必要）
- PageProps<'/path'> / LayoutProps<'/path'> のグローバル型ヘルパーが使える（next dev/build/typegen で生成）

## 今回の実装方針
- ゲーム本体（プレイ画面）はクライアントコンポーネント（"use client"）
  - 理由: YouTube IFrame Player API操作、キー入力イベント、requestAnimationFrameでのノーツ描画など、
    ブラウザAPI・リアルタイム操作が中心のため
- ルーティング構成（予定）
  - / … 曲一覧（既存の他ページ dvd/ とは独立）
  - /play/[songId] … プレイ画面
- 状態管理: まずは React標準の useState/useRef/useReducer で十分。肥大化したら再検討
- YouTube連携: YouTube IFrame Player API（外部JSを動的ロード）
- 歌詞データ: 独自JSON形式（1文字/単語単位 start/end 秒）を/src内に配置し、曲ごとに読み込む
- ローマ字変換: かな→ローマ字変換テーブルを自前実装（複数パターン許容を見据えた設計）
- 描画: Canvas or 素のDOM+CSS transformでノーツを流す（判断は実装フェーズで決定）

## 既存ファイル構成（流用時の注意）
- src/app/page.tsx … 既存のトップページ（要確認・上書き注意）
- src/app/dvd/ … 別用途の既存ページ（DVDバウンドロゴ的なもの）。触らない
- AGENTS.md にNext.js 16の非互換に関する注記あり（実装前にdocs参照を徹底する旨）

## 未確定
- パッケージ追加の要否（現時点でYouTube API用の追加npmパッケージは不要、IFrame APIをscriptタグで読み込む想定）
- デプロイ先（Vercel CLI導入済みとのことなので、Vercelを想定）
