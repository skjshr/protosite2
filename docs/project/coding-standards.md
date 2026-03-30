# コーディング規約

## 0. この規約の目的

コードを短くするためでなく、**後から追えるようにするため**の規約。
AI生成コードであっても人間が読めることを最低条件とする。

---

## 1. TypeScript

### 1.1 型安全

- `any` は使わない。どうしても必要な場合は `unknown` を使い、型ガードで絞る
- 型アサーション `as Foo` はキャストの根拠をコメントで書く
- `!` による非nullアサーションは、nullにならない理由が自明な場合のみ許容

```typescript
// NG
const user = data as User;

// OK（APIレスポンスのバリデーション済み直後）
const user = data as User; // POST /api/user/onboarding でバリデーション済み

// NG
const name = user!.username;

// OK（onboarding 完了済みが middleware で保証される場合）
const name = session.user.id!; // middleware でログイン済みが保証されている
```

### 1.2 型定義の方針

- `type` と `interface` は以下で使い分ける
  - 外部 API・DB 由来のデータ構造 → `type`
  - React コンポーネントの Props → `type`
  - 拡張（extends）が必要な場合 → `interface`
- Union型はリテラル型で表現する

```typescript
// 状態は string ではなくリテラル Union
type WorkSessionStatus = "idle" | "working" | "paused" | "ended";

// Props は type
type TimerDisplayProps = {
  effectiveSeconds: number;
  status: WorkSessionStatus;
};
```

### 1.3 const と as const

- 変更しない配列・オブジェクトには `as const` をつける
- ループ変数以外は `let` より `const` を優先する

```typescript
const SYSTEM_THEME_KEYS = ["miner", "fisher", "collector"] as const;
type SystemThemeKey = (typeof SYSTEM_THEME_KEYS)[number];
```

### 1.4 null / undefined

- DB から来るオプショナル値は `null` で統一（`undefined` と混在させない）
- 関数の「値なし」戻り値は `null` を返す（`undefined` は使わない）
- オプショナルな Props は `foo?: string` ではなく `foo: string | null` を検討する

### 1.5 import

並び順を以下で統一する（自動整形がない場合は手動で合わせる）。

```typescript
// 1. Node 標準モジュール（ない場合は省略）

// 2. 外部パッケージ
import { getServerSession } from "next-auth";
import { prisma } from "@/server/db/client";

// 3. 内部モジュール（絶対パス @/ 使用）
import { calculateLevel } from "@/lib/level";
import type { HomeDataResponse } from "@/types/api";

// 4. 同一ディレクトリ内
import { formatSeconds } from "./time-format";
```

- `import *` は使わない
- 型のみの import は `import type` を使う
- barrel ファイル（`index.ts` で再エクスポート）は作らない

---

## 2. 命名規則

### 2.1 変数・プロパティ

camelCase。意味が明確な英語を使う。省略しすぎない。

```typescript
// NG
const d = new Date();
const secs = 3600;
const tmp = calculateScore(session);

// OK
const now = new Date();
const pauseAccumulatedSeconds = 3600;
const rawSessionScore = calculateRawSessionScore(session);
```

### 2.2 関数

動詞から始める。何をするか・何を返すかが分かる名前にする。

| パターン | 用途 | 例 |
|---------|------|---|
| `calculate*` | 値を計算して返す | `calculateEffectiveSeconds` |
| `determine*` | 条件から判定して返す | `determineRewardRarity` |
| `create*` | 新しいオブジェクトを作る | `createWorkSession` |
| `build*` | データを組み立てる | `buildHomeDataResponse` |
| `find*` | DBから1件探す | `findUserById` |
| `list*` | DBから複数取得 | `listFieldsByUserId` |
| `save*` | DBに書き込む | `saveEndedWorkSession` |
| `update*` | DBを更新する | `updateUsername` |
| `resolve*` | 複数条件から確定する | `resolveUserByOAuthProfile` |
| `get*` | データを取得（副作用なし） | `getHomeData` |

### 2.3 boolean

`is` / `has` / `can` / `should` で始める。

```typescript
const isPublic = field.isPublic;
const hasActiveSession = activeSession !== null;
const canResumeSession = activeSession?.status === "paused";
const leveledUp = newLevel > previousLevel;
```

### 2.4 定数

UPPER_SNAKE_CASE。マジックナンバーを直書きしない。

```typescript
// NG
if (effectiveMinutes > 120) { ... }
if (Math.random() < 0.02) { ... }

// OK
const MAX_RECOMMENDED_EFFECTIVE_MINUTES = 120;
const EPIC_BASE_DROP_RATE = 0.02;
```

### 2.5 ファイル・ディレクトリ

- ファイル：kebab-case（`work-session.ts`, `item-drop.ts`, `time-format.ts`）
- コンポーネント：PascalCase（`TimerDisplay.tsx`, `SessionResultCard.tsx`）
- テスト：対象ファイル名 + `.test.ts`（`work-session.test.ts`）

### 2.6 DB モデル・Prisma

- モデル名：PascalCase 単数形（`User`, `WorkSession`, `ThemeItem`）
- カラム名：camelCase（`startedAt`, `pauseAccumulatedSeconds`）
- 列挙値：camelCase（`working`, `paused`, `ended`）
- リレーション名：参照先モデルの camelCase（`user`, `fields`, `workSessions`）

---

## 3. 関数設計

### 3.1 1関数1目的

1つの関数に複数の責務を持たせない。

```typescript
// NG：セッション終了・スコア計算・DB保存・報酬抽選を1関数でやる
async function endSessionAndSave(session, fieldId, userId) { ... }

// OK：目的ごとに分割する
const effectiveSeconds = calculateEffectiveSeconds(session, now);
const rawScore = calculateRawSessionScore(effectiveSeconds, session.pauseAccumulatedSeconds);
const xpGained = calculateXpFromRawScore(rawScore);
const droppedItem = await selectDroppedItem(fieldId, rawScore, userLevel);
await saveEndedWorkSessionForUser({ userId, fieldId, effectiveSeconds, rawScore, xpGained, droppedItem });
```

### 3.2 引数の数

引数が4つ以上になる場合はオブジェクトにまとめる。

```typescript
// NG
function saveEndedWorkSession(userId, fieldId, startedAt, endedAt, pauseAccumulatedSeconds, score, xp) { }

// OK
function saveEndedWorkSession(params: {
  userId: string;
  fieldId: string;
  startedAt: Date;
  endedAt: Date;
  pauseAccumulatedSeconds: number;
  score: number;
  xpGained: number;
}) { }
```

### 3.3 純粋関数 vs 副作用のある関数

`src/lib/` の関数は副作用を持たない。
- 引数だけで結果が決まる
- DB・ネットワーク・日時・乱数を直接参照しない
- 乱数・日時が必要な場合は引数で受け取る

```typescript
// NG：lib の中で Date.now() を呼ぶ
function calculateCurrentEffectiveSeconds(session: ActiveWorkSession): number {
  return (Date.now() - session.startedAt.getTime()) / 1000; // 副作用
}

// OK：now を引数で受け取る
function calculateCurrentEffectiveSeconds(session: ActiveWorkSession, now: Date): number {
  return (now.getTime() - session.startedAt.getTime()) / 1000;
}
```

---

## 4. コメント方針

### 4.1 「なぜ」を書く。「何」はコードで分かるようにする

```typescript
// NG
pauseAccumulatedSeconds += pausedDuration;
// pausedDuration を加算する

// OK
pauseAccumulatedSeconds += pausedDuration;
// 再開ごとに休憩時間を累積しておく。
// effectiveSeconds 計算時に一括で差し引くことでロジックを単純化する。
```

### 4.2 複雑な条件は関数名に意味を持たせる

```typescript
// NG：コメントで説明する
// 45〜60分かつ休憩5〜10分の場合は最高倍率
if (effectiveMinutes >= 45 && effectiveMinutes <= 60 && restMinutes >= 5 && restMinutes <= 10) { }

// OK：関数名で表現する
if (isInRecommendedFocusWindow(effectiveMinutes, restMinutes)) { }
```

### 4.3 TODO コメントには理由を書く

```typescript
// TODO: ThemeKey enum → String 移行後にここの型を更新する（decisions/002を参照）
```

---

## 5. エラー処理

### 5.1 API ルートのエラーレスポンス形式

全エンドポイントで統一する。

```typescript
// 正常系
return NextResponse.json({ ok: true }, { status: 200 });
return NextResponse.json(data, { status: 200 });

// 異常系
return NextResponse.json({ error: "フィールドが見つかりません" }, { status: 404 });
return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
```

### 5.2 状態破壊を防ぐガード

不正な状態遷移は早期リターンで防ぐ。

```typescript
// セッション終了のガード
if (session.status === "ended") {
  // 既に終了済みのセッションに対して操作しない
  return NextResponse.json({ error: "セッションは既に終了しています" }, { status: 400 });
}
```

### 5.3 catch の握りつぶし禁止

```typescript
// NG
try {
  await saveSession();
} catch {
  // 何も返さない
}

// OK
try {
  await saveSession();
} catch (error) {
  console.error("セッション保存に失敗:", error);
  return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
}
```

---

## 6. React / Next.js コンポーネント

### 6.1 Server Component vs Client Component

- デフォルトは Server Component
- `useState` / `useEffect` / `setInterval` / ブラウザ API を使う場合のみ `"use client"` を付ける
- `"use client"` の境界はできるだけ末端のコンポーネントに押し込む

### 6.2 コンポーネントの責務

```
app/page.tsx（Client Component）
  ├── useState でデータ・セッション状態を管理
  ├── useEffect でデータ取得
  ├── API 呼び出し（api-client.ts 経由）
  └── 子コンポーネントに props を渡すだけ

app/components/TimerDisplay.tsx（stateless）
  ├── props のみで描画
  └── ロジックなし
```

### 6.3 Props の定義

- Props 型は `type ComponentNameProps` で定義する
- コンポーネントファイルの先頭に置く

```typescript
type SessionResultCardProps = {
  effectiveSeconds: number;
  score: number;
  xpGained: number;
  leveledUp: boolean;
  droppedItem: DroppedItem | null;
  onClose: () => void;
};

export function SessionResultCard({ effectiveSeconds, ... }: SessionResultCardProps) { }
```

---

## 7. コミット方針

### 7.1 コミットメッセージの形式

```
<type>: <概要>（日本語 or 英語どちらでも可）

type:
  feat    新機能
  fix     バグ修正
  refactor リファクタリング（機能変更なし）
  docs    ドキュメントのみの変更
  test    テストの追加・修正
  chore   設定・依存関係の変更
```

```
# 例
feat: アイテムドロップ判定ロジックを実装
fix: 休憩中にタイマーが進み続ける問題を修正
refactor: calculateScore を lib/scoring.ts に移動
docs: level-system の設計書を有効時間ベースに更新
```

### 7.2 コミットの粒度

- 1コミット1目的
- 「とりあえず動いた」ではコミットしない
- ファイルをまとめて追加するより、機能単位で切る

---

## 8. AI生成コードの扱い

- 生成されたコードは必ず差分を読む
- 命名がこの規約に合っているか確認する
- 責務が複数入っていたら分割する
- 説明できないコードは採用しない
- 1タスク1責務で生成させる（「全部作って」はしない）
