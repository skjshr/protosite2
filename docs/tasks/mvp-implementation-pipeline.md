# MVP 実装パイプライン（Codex作業指示）

## この文書の使い方

Phase 0 から順番に実装する。
各 Phase は独立したコミット単位とする。
Phase 内の作業は上から順に進める。

実装前に必ず以下を読むこと：
- `docs/project/coding-standards.md`
- `docs/project/architecture.md`
- `docs/requirements/product-spec.md`
- 各 Phase に記載された参照ドキュメント

---

## Phase 0: 基盤準備

### 参照ドキュメント
- `docs/features/guest-mode.md`

### 0-1. robots.txt

**作成するファイル**

`public/robots.txt`

```
User-agent: *
Disallow: /api/
Disallow: /onboarding

Sitemap: （後で追加）
```

**完了条件**
- `GET /robots.txt` でファイルが返る

---

### 0-2. ゲストモード対応

**変更するファイル**

`src/middleware.ts`
- 未認証ユーザーが `/` にアクセスした場合、`/login` にリダイレクトしない
- `/onboarding` への未認証アクセスは引き続き `/login` にリダイレクトする
- 認証済みで `onboardingCompleted === false` の場合は `/onboarding` にリダイレクト（変更なし）

**完了条件**
- ログインせずに `/` にアクセスできる
- ログインせずに `/onboarding` にアクセスすると `/login` にリダイレクトされる

---

## Phase 1: ホームUI

### 参照ドキュメント
- `docs/design/screen-components.md`
- `docs/features/session-flow.md`
- `docs/features/guest-mode.md`
- `docs/design/api-spec.md`

### 1-1. 型・APIクライアントの確認

以下が実装済みであることを確認する。なければ追加する。

`src/types/api.ts` に存在すべき型：
- `HomeDataResponse`
- `CreateFieldRequest`
- `SaveEndedWorkSessionRequest`
- `SaveEndedWorkSessionResponse`

`src/lib/api-client.ts` に存在すべき関数：
- `fetchHomeData(): Promise<HomeDataResponse>`
- `createFieldRequest(payload): Promise<void>`
- `saveEndedWorkSessionRequest(payload): Promise<SaveEndedWorkSessionResponse>`

---

### 1-2. ホーム画面の実装

**変更するファイル**

`src/app/page.tsx`

**実装する状態（useState）**

```typescript
// サーバーデータ
homeData: HomeDataResponse | null
isLoadingHomeData: boolean

// セッション（メモリのみ）
activeSession: ActiveWorkSession | null

// セッション結果（終了後に表示）
sessionResult: (SaveEndedWorkSessionResponse & { isGuest?: boolean }) | null

// UI
selectedFieldId: string | null   // フィールド選択（ログイン済みのみ使用）
activeTab: "home" | "collection" // Phase 4 で使用
```

**実装する画面構成**

```
page.tsx
├── ゲストバナー（未認証の場合のみ）
│     「ゲストモードで体験中 — 記録を残すには [ログイン]」
│
├── ヘッダー
│     ユーザー名（ゲストは「ゲスト」と表示）
│     総XP表示（ログイン済みのみ。ゲストは非表示）
│     ログアウトボタン（ログイン済みのみ）
│
├── [セッション結果エリア] ← sessionResult がある場合のみ表示
│     有効時間 / スコア / 獲得XP
│     ゲストの場合: 「ログインして記録を保存する」ボタン
│     ログイン済みの場合: 「次のセッションを始める」ボタン
│
├── [セッションエリア] ← sessionResult がない場合に表示
│     [idle・ログイン済み]
│       フィールド選択プルダウン（homeData.fields から生成）
│       「フィールドを選んで開始」ボタン
│
│     [idle・ゲスト]
│       「ゲストセッションを開始する」ボタン
│
│     [working]
│       タイマー表示（mm:ss）← 1秒ごとに更新
│       「休憩」ボタン / 「終了」ボタン
│
│     [paused]
│       タイマー表示（一時停止中）
│       「再開」ボタン / 「終了」ボタン
│
├── [フィールド累計一覧]（ログイン済みのみ）
│     homeData.fields を一覧表示
│     フィールド名 / テーマ / 累計有効時間 / 累計セッション数
│
└── [最近の履歴]（ログイン済みのみ）
      homeData.recentWorkSessions を5件表示
      日時 / 有効時間 / スコア / XP
```

**タイマー更新の実装**

```typescript
useEffect(() => {
  if (!activeSession || activeSession.status !== "working") return;
  const interval = setInterval(() => {
    // calculateCurrentEffectiveSeconds(activeSession, new Date()) の結果を
    // 表示用の state に格納する（activeSession 自体は変えない）
  }, 1000);
  return () => clearInterval(interval);
}, [activeSession]);
```

**セッション終了の実装**

```typescript
async function handleEndSession() {
  if (!activeSession) return;
  const now = new Date();
  const ended = endWorkSession(activeSession, now);

  if (session) {
    // ログイン済み：APIに保存
    const result = await saveEndedWorkSessionRequest({
      fieldId: ended.fieldId,
      startedAt: activeSession.startedAt.toISOString(),
      endedAt: now.toISOString(),
      pauseAccumulatedSeconds: activeSession.pauseAccumulatedSeconds,
    });
    setSessionResult(result);
    // homeData を再取得して累計を更新
    const refreshed = await fetchHomeData();
    setHomeData(refreshed);
  } else {
    // ゲスト：ローカル計算のみ
    const rawScore = calculateRawSessionScore(
      ended.effectiveSeconds,
      activeSession.pauseAccumulatedSeconds,
    );
    setSessionResult({
      effectiveSeconds: ended.effectiveSeconds,
      score: roundScoreForDisplay(rawScore),
      xpGained: calculateXpFromRawScore(rawScore),
      droppedItem: null,
      isGuest: true,
    });
  }
  setActiveSession(null);
}
```

**完了条件**
- ゲストがタイマーを開始/休憩/再開/終了できる
- ゲストがセッション結果を確認できる（保存されない）
- ログイン済みユーザーがフィールドを選んでセッションを操作できる
- ログイン済みユーザーのセッション終了後にDBに保存される
- ログイン済みユーザーのホームにフィールド一覧・履歴が表示される
- タイマーが1秒ごとに更新される

---

## Phase 2: レベルシステム

### 参照ドキュメント
- `docs/design/level-system.md`

### 2-1. DBスキーマ変更

**変更するファイル**

`prisma/schema.prisma`
- `User` モデルに `totalEffectiveSeconds Int @default(0)` を追加

マイグレーション実行：
```
npx prisma migrate dev --name add_user_total_effective_seconds
```

---

### 2-2. lib/level.ts の実装

**作成するファイル**

`src/lib/level.ts`

実装する関数：

```typescript
// レベル算出（有効時間ベース）
// Lv70 @ 1000h、Lv100 @ 5000h を通るべき乗曲線
export function calculateLevel(totalEffectiveSeconds: number): number

// secondsForLevel の逆関数（プログレスバー計算用）
export function secondsForLevel(level: number): number

// レベル進捗率
export type LevelProgress = {
  level: number;
  currentLevelSeconds: number;
  nextLevelSeconds: number;
  progressSeconds: number;
  progressRate: number; // 0.0〜1.0
};
export function calculateLevelProgress(totalEffectiveSeconds: number): LevelProgress
```

定数：
```typescript
const LEVEL_COEFFICIENT = 14.4;
const LEVEL_EXPONENT = 0.227;
```

---

### 2-3. セッション終了APIの拡張

**変更するファイル**

`src/server/repositories/work-session-repository.ts`
- トランザクション内で `User.totalEffectiveSeconds` を `{ increment: effectiveSeconds }` で更新する

`src/app/api/sessions/end/route.ts`
- 保存前後のレベルを比較して `leveledUp` を検出する
- レスポンスに以下を追加する：
  - `totalEffectiveSeconds: number`
  - `totalXp: number`
  - `level: number`
  - `leveledUp: boolean`
  - `levelProgress: LevelProgress`

`src/types/api.ts`
- `SaveEndedWorkSessionResponse` に上記フィールドを追加する

---

### 2-4. ホームデータAPIの拡張

**変更するファイル**

`src/server/services/home-data-service.ts`
- `summary` に `level: number` と `levelProgress: LevelProgress` を追加する

`src/types/api.ts`
- `HomeDataResponse.summary` の型を更新する

---

### 2-5. ホームUIの更新

**変更するファイル**

`src/app/page.tsx`
- ヘッダーに `Lv XX` 表示とプログレスバーを追加する（ログイン済みのみ）
- セッション結果エリアに `leveledUp === true` の場合のレベルアップ表示を追加する

**完了条件**
- セッション終了後に `User.totalEffectiveSeconds` が増加している
- ホームのヘッダーにレベルが表示される
- セッション終了結果にレベルアップ表示が出る（条件を満たした場合）

---

## Phase 3: ThemeKey enum → String + アイテムシードデータ

### 参照ドキュメント
- `docs/decisions/002-theme-key-enum.md`
- `docs/design/item-reward-system.md`

### 3-1. ThemeKey enum の削除

**変更するファイル**

`prisma/schema.prisma`
- `enum ThemeKey { miner fisher collector }` を削除する
- `Theme.key` の型を `ThemeKey` から `String` に変更する

マイグレーション実行：
```
npx prisma migrate dev --name remove_theme_key_enum
```

`src/types/field.ts`
- `ThemeKey` を `"miner" | "fisher" | "collector"` から `string` に変更する

`src/server/constants/theme-keys.ts`（新規作成）
```typescript
export const SYSTEM_THEME_KEYS = ["miner", "fisher", "collector"] as const;
export type SystemThemeKey = (typeof SYSTEM_THEME_KEYS)[number];
```

**完了条件**
- マイグレーションが通る
- 既存のテーマデータが壊れていない
- `npx prisma studio` でテーマが確認できる

---

### 3-2. アイテムシードデータの追加

**変更するファイル**

`prisma/seed.ts`
- 各テーマに以下のアイテムを追加する（最小セット）

| テーマ | common | rare | epic |
|--------|--------|------|------|
| miner（鉱夫） | 5種 | 3種 | 1種 |
| fisher（漁師） | 5種 | 3種 | 1種 |
| collector（収集家） | 5種 | 3種 | 1種 |

各テーマのアイテム例：

**miner（鉱夫）**
- common: 石炭のかけら, 錆びた釘, 古い金属片, 粗削りの石, 砂利
- rare: 銀鉱石, 蛍石の結晶, 古代の硬貨
- epic: 紅蓮のルビー

**fisher（漁師）**
- common: 小石, 濡れた羽根, 流木の欠片, 古い釣り糸, 貝殻
- rare: 真珠, 深海の鱗, 光る石
- epic: 嵐の結晶

**collector（収集家）**
- common: 古い切手, 錆びたコイン, 小さな陶器片, 枯れた押し花, 色あせたラベル
- rare: 羊皮紙の断片, 骨董の鍵, 金のインクの羽根ペン
- epic: 失われた地図

`ThemeItem` には各アイテムに `dropWeight`（common: 10, rare: 5, epic: 1）を設定する。
`unlockLevel` は epic のみ `5` を設定し、他は `null`。

シード実行：
```
npx prisma db seed
```

**完了条件**
- `npx prisma studio` でアイテムデータが確認できる
- ThemeItem に dropWeight が設定されている

---

## Phase 4: アイテムドロップ + 図鑑

### 参照ドキュメント
- `docs/design/item-reward-system.md`

### 4-1. lib/item-drop.ts の実装

**作成するファイル**

`src/lib/item-drop.ts`

実装する関数：

```typescript
// ドロップするか否か（score に基づく確率）
export function shouldDrop(score: number): boolean

// レアリティ抽選（score に基づく確率テーブル）
export function determineRarity(score: number): "common" | "rare" | "epic"

// 重み付きランダム選択（候補ゼロなら null）
export function selectWeightedRandom<T extends { dropWeight: number }>(
  candidates: T[]
): T | null
```

確率テーブルは `docs/design/item-reward-system.md` の §4 を参照。

`shouldDrop` と `determineRarity` では `Math.random()` を使用する。
テスト時はモックしやすいよう、乱数生成関数を引数で受け取れる形にする：

```typescript
export function shouldDrop(score: number, rand = Math.random): boolean
export function determineRarity(score: number, rand = Math.random): "common" | "rare" | "epic"
```

---

### 4-2. item-repository.ts の実装

**作成するファイル**

`src/server/repositories/item-repository.ts`

実装する関数：

```typescript
// テーマに紐づく ThemeItem 一覧を取得（Item を include）
export async function listThemeItemsWithItems(themeId: string): Promise<ThemeItemWithItem[]>

// UserItem を作成する
export async function createUserItem(params: {
  userId: string;
  itemId: string;
  acquiredWorkSessionId: string;
}): Promise<UserItem>

// ユーザーの取得済みアイテム一覧（itemId の Set として返す）
export async function listAcquiredItemIdsByUserId(userId: string): Promise<Set<string>>
```

---

### 4-3. sessions/end へのドロップ統合

**変更するファイル**

`src/app/api/sessions/end/route.ts`
- スコア計算後にアイテムドロップ判定を追加する
- ドロップ判定ロジック：
  1. `shouldDrop(score)` → false なら droppedItem = null でスキップ
  2. `determineRarity(score)` → レアリティを決定
  3. `listThemeItemsWithItems(field.themeId)` → 候補を取得
  4. レアリティ + ユーザーレベルでフィルタ
  5. `selectWeightedRandom(candidates)` → アイテム選択
  6. 選ばれた場合、トランザクション内で `createUserItem` を実行

`src/server/repositories/work-session-repository.ts`
- `saveEndedWorkSessionForUser` のトランザクションに UserItem 作成を組み込む

`src/types/api.ts`
- `SaveEndedWorkSessionResponse.droppedItem` を追加する：
  ```typescript
  droppedItem: {
    id: string;
    key: string;
    name: string;
    rarity: "common" | "rare" | "epic";
    description: string | null;
  } | null;
  ```

---

### 4-4. GET /api/collection の実装

**作成するファイル**

`src/app/api/collection/route.ts`

処理：
1. 認証確認（未認証は 401）
2. `listFieldsByUserId` でユーザーのテーマ一覧を取得
3. テーマごとに全 Item を取得
4. `listAcquiredItemIdsByUserId` で取得済み itemId を取得
5. `isAcquired` フラグを付けてレスポンスを組み立てる

レスポンス型：
```typescript
type CollectionResponse = {
  themes: Array<{
    themeKey: string;
    themeDisplayName: string;
    items: Array<{
      id: string;
      key: string;
      name: string;
      rarity: "common" | "rare" | "epic";
      description: string | null;
      isAcquired: boolean;
      acquiredAt: string | null;
    }>;
  }>;
};
```

`src/types/api.ts` に `CollectionResponse` を追加する。
`src/lib/api-client.ts` に `fetchCollection(): Promise<CollectionResponse>` を追加する。

---

### 4-5. コレクションタブUIの実装

**変更するファイル**

`src/app/page.tsx`
- タブ切り替え（`activeTab: "home" | "collection"`）を実装する
- コレクションタブ初回表示時に `fetchCollection()` を呼ぶ
- セッション終了でアイテムドロップがあった場合、コレクションキャッシュを無効化して再取得する

**コレクションタブの表示仕様**

```
コレクションタブ
└── ユーザーが持つテーマのサブタブ（ユーザーのフィールドのテーマのみ）
    └── アイテムグリッド
         ├── 取得済み：name / rarity / description
         └── 未取得：「???」（存在は分かるが内容は分からない）
```

**セッション結果エリアの更新**
- `droppedItem` がある場合、アイテム名・レアリティ・説明文を表示する

**完了条件**
- セッション終了時にドロップ判定が走る
- 取得アイテムが UserItem に保存される
- 図鑑タブでアイテム一覧が確認できる
- 未取得アイテムが「???」で表示される

---

## Phase 5: ランキング

### 参照ドキュメント
- `docs/design/ranking-system.md`

### 5-1. lib/week.ts の実装

**作成するファイル**

`src/lib/week.ts`

```typescript
// 月曜始まりの週の開始日時（UTC）を返す
export function getCurrentWeekStartUtc(now: Date): Date

// 週の終了日時（exclusive upper bound）を返す
export function getCurrentWeekEndUtc(weekStart: Date): Date
```

---

### 5-2. ranking-repository.ts の実装

**作成するファイル**

`src/server/repositories/ranking-repository.ts`

```typescript
// 指定週の全ユーザーの週次スコアを集計して返す（降順）
export async function listWeeklyRanking(
  weekStart: Date,
  weekEnd: Date,
): Promise<Array<{ userId: string; username: string; weeklyScore: number }>>
```

実装方針：
1. `prisma.workSession.groupBy` で userId ごとの score 合計を取得
2. userId リストで `prisma.user.findMany` を実行して username を取得
3. 結合して返す

---

### 5-3. ranking-service.ts の実装

**作成するファイル**

`src/server/services/ranking-service.ts`

```typescript
type RankingEntry = {
  rank: number;
  username: string;
  weeklyScore: number;
  isCurrentUser: boolean;
};

// 全ランキングから現在ユーザーを中心に上下2件を抽出する
export function extractNearbyRanking(
  allRanking: Array<{ userId: string; username: string; weeklyScore: number }>,
  currentUserId: string,
  neighborCount?: number, // default: 2
): RankingEntry[]
```

ランクなし（今週スコアゼロ）の場合は上位2件のみを返す。

---

### 5-4. GET /api/ranking の実装

**作成するファイル**

`src/app/api/ranking/route.ts`

レスポンス型（`src/types/api.ts` に追加）：
```typescript
type RankingResponse = {
  weekStart: string;
  weekEnd: string;
  myRank: number | null;
  myWeeklyScore: number;
  nearby: RankingEntry[];
};
```

`src/lib/api-client.ts` に `fetchRanking(): Promise<RankingResponse>` を追加する。

---

### 5-5. ランキング表示UIの実装

**変更するファイル**

`src/app/page.tsx`
- ホームタブの下部にランキングセクションを追加する
- ページ初回ロード時に `fetchRanking()` を呼ぶ
- ログイン済みのみ表示する

**表示仕様**

```
ランキング（今週）
  3位  username_a   200.0pt
  4位  username_b   180.5pt
★ 5位  自分         123.4pt  ← isCurrentUser
  6位  username_c   110.0pt
  7位  username_d    95.0pt
```

**完了条件**
- 週次スコアが集計されてランキングに反映される
- 自分の順位が強調表示される
- 今週スコアがない場合は上位2件のみ表示される

---

## Phase 6: テスト

### 参照ドキュメント
- `docs/test/test-strategy.md`

### 6-1. vitest の導入

**変更するファイル**

`package.json`
- devDependencies に追加：
  - `"vitest": "^1.x"`
  - `"@vitest/coverage-v8": "^1.x"`
- scripts に追加：
  - `"test": "vitest run"`
  - `"test:watch": "vitest"`
  - `"test:coverage": "vitest run --coverage"`

**作成するファイル**

`vitest.config.ts`
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

### 6-2. lib/scoring.test.ts の実装

**作成するファイル**

`src/lib/scoring.test.ts`

テストケースは `docs/test/test-strategy.md` の「src/lib/scoring.ts」セクションを参照。

必須ケース：
- 有効時間 0秒 → スコア 0
- 有効時間 9分59秒 → スコア 0（乗数 0）
- 有効時間 10分 → スコア > 0
- 有効時間 52分、休憩 7分 → 最高倍率（1.15 × 1.05）が適用される
- 有効時間 121分 → 乗数 0.35 が適用される
- `calculateXpFromRawScore` → `Math.floor` の確認

---

### 6-3. lib/work-session.test.ts の実装

**作成するファイル**

`src/lib/work-session.test.ts`

必須ケース：
- `createWorkSession` → status = "working", startedAt が設定される
- `pauseWorkSession` → status = "paused", pausedAt が設定される
- `resumeWorkSession` → pauseAccumulatedSeconds に休憩時間が加算される
- `calculateCurrentEffectiveSeconds`（作業中）→ now - startedAt - accumulated
- `calculateCurrentEffectiveSeconds`（休憩中）→ pausedAt - startedAt - accumulated
- `endWorkSession` → effectiveSeconds が正しく計算される

`now` は固定値を渡してテストを決定論的にすること。

---

### 6-4. lib/level.test.ts の実装

**作成するファイル**

`src/lib/level.test.ts`

必須ケース：
- `calculateLevel(0)` → 1
- `calculateLevel(3_600_000)` → 70（±1 許容）
- `calculateLevel(18_000_000)` → 100（±1 許容）
- `secondsForLevel(1)` → 0
- `secondsForLevel(n) < secondsForLevel(n + 1)` → 単調増加
- `calculateLevelProgress` → progressRate が 0.0〜1.0 の範囲内

---

### 6-5. lib/item-drop.test.ts の実装

**作成するファイル**

`src/lib/item-drop.test.ts`

必須ケース：
- `shouldDrop(score < 5, () => 0)` → false（ドロップなし）
- `selectWeightedRandom([])` → null
- `selectWeightedRandom` の重み付き選択 → 重みに比例した出現率（1000回試行・5%誤差以内）

---

### 6-6. lib/week.test.ts の実装

**作成するファイル**

`src/lib/week.test.ts`

必須ケース：
- 月曜日を渡す → その日の 00:00:00 UTC
- 日曜日を渡す → 前の月曜の 00:00:00 UTC
- 週の終了日時 → 開始 + 7日

---

## 全体の完了条件

- `npm run build` が通る
- `npm run lint` が通る
- `npm run test` が全件 pass する
- ゲストがタイマーを操作して結果を確認できる
- ログイン済みユーザーがセッションを終了してアイテムを獲得できる
- 図鑑で取得済み・未取得アイテムが確認できる
- ランキングが表示される
- レベルがホームに表示される
