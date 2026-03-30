# レベル・XP成長システム 詳細設計

## 1. 目的

- ユーザーの**累積有効時間**からレベルを算出し、成長を可視化する
- レベルアップをセッション終了時に検出してフロントに通知する
- レベルはアイテムの `unlockLevel` と連動する

## 2. レベルの基準軸

レベルは **総XPではなく累積有効時間（秒）** を基準にする。

- XPはスコア倍率（リズムの良さ）に依存するため、作業量と連動しにくい
- レベルは「どれだけ積み上げたか」を表す純粋な成長指標として分離する

| 累積有効時間 | レベル目安 |
|------------|-----------|
| 0h         | Lv 1      |
| 10h        | Lv ~25    |
| 50h        | Lv ~43    |
| 100h       | Lv ~52    |
| 300h       | Lv ~62    |
| 1,000h     | **Lv 70** |
| 5,000h     | **Lv 100** |

序盤（〜10h）は上がりやすく、中盤以降は緩やかになる曲線。

## 3. レベル算出方式

### べき乗公式

```typescript
// src/lib/level.ts

// Lv70 @ 1000h、Lv100 @ 5000h を通るべき乗曲線
// level = floor(LEVEL_COEFFICIENT * hours ^ LEVEL_EXPONENT) + 1
const LEVEL_COEFFICIENT = 14.4;
const LEVEL_EXPONENT = 0.227;

function totalSecondsToHours(totalSeconds: number): number {
  return totalSeconds / 3600;
}

function calculateLevel(totalEffectiveSeconds: number): number {
  if (totalEffectiveSeconds <= 0) return 1;
  const hours = totalSecondsToHours(totalEffectiveSeconds);
  return Math.floor(LEVEL_COEFFICIENT * Math.pow(hours, LEVEL_EXPONENT)) + 1;
}
```

### レベル内進捗率（プログレスバー用）

次のレベルに到達する秒数を逆算して進捗率を求める。

```typescript
function secondsForLevel(level: number): number {
  // calculateLevel の逆関数
  // level = floor(A * h^B) + 1 → h = ((level - 1) / A) ^ (1/B)
  if (level <= 1) return 0;
  const hours = Math.pow((level - 1) / LEVEL_COEFFICIENT, 1 / LEVEL_EXPONENT);
  return Math.ceil(hours * 3600);
}

type LevelProgress = {
  level: number;
  currentLevelSeconds: number; // 現レベル到達に必要だった累積秒数
  nextLevelSeconds: number;    // 次レベル到達に必要な累積秒数
  progressSeconds: number;     // 現レベル内での進捗秒数
  progressRate: number;        // 0.0〜1.0
};

function calculateLevelProgress(totalEffectiveSeconds: number): LevelProgress {
  const level = calculateLevel(totalEffectiveSeconds);
  const currentLevelSeconds = secondsForLevel(level);
  const nextLevelSeconds = secondsForLevel(level + 1);
  const progressSeconds = totalEffectiveSeconds - currentLevelSeconds;
  const rangeSeconds = nextLevelSeconds - currentLevelSeconds;
  const progressRate = Math.min(progressSeconds / rangeSeconds, 1.0);
  return { level, currentLevelSeconds, nextLevelSeconds, progressSeconds, progressRate };
}
```

## 4. User.totalEffectiveSeconds の管理

現在 `User` モデルに `totalEffectiveSeconds` カラムがないため、追加が必要。

### スキーマ変更

```prisma
model User {
  // 既存
  totalXp                  Int  @default(0)
  // 追加
  totalEffectiveSeconds    Int  @default(0)
}
```

### 更新タイミング

セッション終了トランザクション（`saveEndedWorkSessionForUser`）内で、
`WorkSession` 保存・`Field` 更新・`User.totalXp` 更新と同時にインクリメントする。

```typescript
prisma.user.update({
  where: { id: userId },
  data: {
    totalXp: { increment: xpGained },
    totalEffectiveSeconds: { increment: effectiveSeconds }, // 追加
  },
})
```

## 5. レベルアップ検出

セッション終了時にサーバー側でレベルアップを検出し、レスポンスに含める。

```typescript
// POST /api/sessions/end の処理内

const previousLevel = calculateLevel(user.totalEffectiveSeconds);
const newTotalEffectiveSeconds = user.totalEffectiveSeconds + effectiveSeconds;
const newLevel = calculateLevel(newTotalEffectiveSeconds);
const leveledUp = newLevel > previousLevel;
```

## 6. レスポンス拡張

```typescript
// src/types/api.ts
type SaveEndedWorkSessionResponse = {
  effectiveSeconds: number;
  score: number;
  xpGained: number;
  droppedItem: DroppedItem | null;
  totalEffectiveSeconds: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  levelProgress: LevelProgress;
};
```

## 7. ホーム画面への反映

`HomeDataResponse.summary` に追加する。

```typescript
summary: {
  totalXp: number;
  totalEffectiveSeconds: number;
  level: number;
  levelProgress: LevelProgress;
}
```

`home-data-service.ts` で `calculateLevel(user.totalEffectiveSeconds)` を呼び出して付加する。

## 8. unlockLevel との連動

- `ThemeItem.unlockLevel` が設定されているアイテムは、ユーザーレベルが下回る場合にドロップ対象から外れる
- アイテムドロップ判定時に `calculateLevel(user.totalEffectiveSeconds)` を使用する
- `src/lib/item-drop.ts` で参照する

## 9. 責務分離

| ファイル | 責務 |
|---------|------|
| `src/lib/level.ts` | `calculateLevel`・`calculateLevelProgress`・`secondsForLevel` の純粋計算 |
| `prisma/schema.prisma` | `User.totalEffectiveSeconds` カラム追加 |
| `src/server/repositories/work-session-repository.ts` | トランザクション内で `totalEffectiveSeconds` をインクリメント |
| `src/app/api/sessions/end/route.ts` | レベルアップ検出・レスポンス構築 |
| `src/server/services/home-data-service.ts` | `summary` にレベル情報を付加 |
| `src/types/api.ts` | レスポンス型の拡張 |

## 10. 今回見送るもの

- レベルごとの称号・バッジ
- フィールド別レベル（ユーザー全体の総合レベルのみ）
- XP ブースト・デバフ機能
- レベルに応じたUI変化（背景・カラーテーマの変化など）
