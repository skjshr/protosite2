# 最小タイマー 詳細設計（初心者向け）

## 1. このドキュメントの目的

このドキュメントは、現在の MVP 実装（複数用途フィールド対応の最小タイマー）を
「なぜこの形にしているか」まで含めて理解するための説明です。

対象は、React / Next.js / TypeScript を学び始めた人です。

## 2. 今回のスコープ

- 複数の用途フィールドを作成できる
- 各フィールドは `id`, `userId`, `name`, `theme`, `isPublic` を持つ
- セッションの操作は以下のみ
1. 開始
2. 休憩
3. 再開
4. 終了
5. 結果表示
- スコアと XP を計算して表示
- 終了済みセッションを DB（SQLite）に保存
- ホームに累計 XP / 累計有効時間 / 最近5件を表示
- フィールド一覧からセッション開始できる

今回はあえて入れていないもの:

- 認証
- 図鑑、ランキング
- アニメーションや見た目の作り込み

## 3. 設計の考え方（重要）

この実装では、**画面表示と業務ロジックを分離**しています。

- `src/app`:
  画面表示、ボタン操作、状態の切り替え（UI層）
- `src/lib`:
  セッション遷移、時間計算、スコア計算（ドメイン層）
- `src/server`:
  DBアクセス、集計、永続化（サーバー層）
- `src/types`:
  データ形状の定義（型層）

この分離により、将来 DB/API を追加しても、コアロジックを流用できます。

## 4. ディレクトリと責務

- `src/app/page.tsx`
  - フィールド作成フォーム、フィールド一覧、進行中表示、結果表示
  - ボタン押下時に `lib` の関数を呼ぶ
- `src/lib/session.ts`
  - 開始/休憩/再開/終了の状態遷移
  - 時刻ベースの有効秒計算
- `src/lib/scoring.ts`
  - 仕様の倍率テーブルに基づくスコア計算
  - XP 計算（`floor(score)`）
- `src/lib/time-format.ts`
  - 秒を `mm:ss` に整形
- `src/lib/api-client.ts`
  - クライアントからAPIへの通信
- `src/lib/field-theme.ts`
  - theme 表示名と説明文の差分管理（複雑分岐は入れない）
- `src/server/db/client.ts`
  - Prisma Client の生成と共有
- `src/server/repositories/*`
  - User / Field / Session ごとの DB 操作
- `src/server/services/home-data-service.ts`
  - ホーム表示用データの組み立て
- `src/app/api/*/route.ts`
  - UI から呼ぶ API エンドポイント（Server 側）
- `src/types/session.ts`
  - `ActiveSession` と `EndedSession` の型定義
- `src/types/session-history.ts`
  - 画面表示用のセッション履歴型
- `src/types/field.ts`
  - フィールド型と theme 型

## 5. 状態遷移ルール

許可する遷移:

1. `idle -> working`
2. `working -> paused`
3. `paused -> working`
4. `working -> ended`
5. `paused -> ended`

このルール外の遷移は、`session.ts` で `Error` を投げて防止しています。

## 6. 「時刻ベース管理」とは何か

このアプリでは、秒カウントを真実として保存しません。
真実は以下の時刻/累積値です。

- `startedAt`
- `pausedAt`
- `endedAt`
- `pauseAccumulatedSeconds`

有効作業秒は次式で毎回計算します。

`effectiveSeconds = endedAt - startedAt - pauseAccumulatedSeconds`

メリット:

- 表示カウントのズレでデータが壊れにくい
- 再計算が可能
- DB 保存時も一貫した値を持てる

## 7. 主要関数の読み方

### 7.1 `createSession(fieldId, fieldName, now)`

- 新しいセッションを `working` で作る
- `fieldId` をセッションへ紐づける
- `startedAt` を記録
- `pauseAccumulatedSeconds` は `0`

### 7.2 `pauseSession(session, now)`

- `working` 以外ならエラー
- `pausedAt` を記録して `paused` へ移行

### 7.3 `resumeSession(session, now)`

- `paused` 以外ならエラー
- `pausedAt` から `now` までの差分を休憩秒として加算
- `pausedAt` を `null` に戻して `working` へ

### 7.4 `endSession(session, now)`

- `paused` 中に終了した場合は、最後の休憩分も加算
- `effectiveSeconds` を計算
- `score` と `xp` を計算
- `EndedSession` を返す

### 7.5 `calculateCurrentEffectiveSeconds(session, now)`

- 進行中画面の表示用
- `paused` 中は時間が進まないように `pausedAt` 時点で固定計算

## 8. スコア計算の詳細

式:

`score = effectiveMinutes × sessionMultiplier × restMultiplier`

XP:

`xp = floor(score)`

ポイント:

- 長時間耐久を過度に有利にしない
- 45〜60分の集中帯を優遇
- 5〜10分の休憩帯を優遇

## 9. UI 側の責務

`page.tsx` は次だけを担当します。

1. ボタン表示の切り替え
2. ユーザー操作の受付
3. `lib` 関数の呼び出し
4. 結果表示

計算ロジックは `lib` に置くことで、UI を薄く保っています。

## 10. 保守時のチェックポイント

1. 新しい状態名を増やす前に、仕様の状態遷移に合うか確認する
2. 秒カウンタを state に保存して真実にしない
3. `page.tsx` に計算ロジックを書き始めたら `lib` へ戻す
4. 仕様の倍率変更は `scoring.ts` だけを編集する
5. 例外メッセージはユーザー向け表示を意識して明快にする

## 11. DB 永続化の補足

使用技術:

- Prisma
- SQLite

今回の方針:

1. 暫定ユーザー（`demo-user`）を seed で1件作る
2. `Field` と `Session` は `userId` を持つ
3. 新規作成・新規終了セッションのみ DB へ保存する
4. 旧 localStorage データは自動移行しない（無視）

## 12. 次の拡張候補（この実装を壊さない順）

1. 認証導入（`demo-user` 固定をログインユーザーへ置換）
2. `session.ts` / `scoring.ts` のテスト追加
