# 最小タイマー 詳細設計（DB中心・WorkSession版）

## 1. 目的
- 最小タイマーMVPを DB 中心に再編し、将来の認証/IdP導入とコンテンツ拡張に耐える骨格を作る。
- ドメイン上の作業セッションは **WorkSession** と呼び、認証セッションと命名衝突しないようにする。

## 2. 今回の実装範囲
- 複数用途フィールド
- Theme 選択付きフィールド作成
- WorkSession の開始/休憩/再開/終了（終了時保存）
- ホーム表示（累計XP、累計有効時間、最近5件）
- Prisma + SQLite 永続化
- Theme / Item / ThemeItem / UserItem のマスタスキーマ追加

## 3. 責務分離
- `src/app/page.tsx`: 表示とイベント受付のみ
- `src/lib/work-session.ts`: 時刻ベースの WorkSession 状態遷移と計算
- `src/lib/scoring.ts`: スコア/XP計算（DBで計算しない）
- `src/lib/api-client.ts`: client→API 通信
- `src/app/api/*`: サーバー入口（入力検証、ユースケース起動）
- `src/server/repositories/*`: Prisma を使ったDBアクセス
- `src/server/services/home-data-service.ts`: ホーム表示用データ組み立て

## 4. DBモデル要点
- `User`: ユーザー本体（`totalXp` を保持）
- `Theme`: `miner/fisher/collector` を含むテーママスタ
- `Field`: `userId` と `themeId` に紐づく用途
- `WorkSession`: 作業セッション本体
- `Item`: 将来図鑑向けのアイテムマスタ
- `ThemeItem`: Theme と Item の中間テーブル
- `UserItem`: ユーザーの取得アイテム

## 5. WorkSession計算方針
- 真実の状態は時刻ベースで管理
  - `startedAt`
  - `pausedAt`
  - `endedAt`
  - `pauseAccumulatedSeconds`
- `effectiveSeconds` はサーバーで再計算して保存
- `score` と `xpGained` もサーバー側で確定

## 6. localStorage 方針
- 旧 localStorage 自動移行は実装しない
- 新規データの真実は DB（SQLite）に統一
- 表示データも DB 由来で構成

## 7. 今回見送ったもの
- 認証、IdP導入
- ランキング
- 図鑑本実装（表示/獲得演出）
- 通知、公開プロフィール、画像演出
