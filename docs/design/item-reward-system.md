# アイテム・図鑑システム 詳細設計

## 1. 目的

- WorkSession 終了時にテーマに応じたアイテムをドロップする
- 獲得アイテムを図鑑として表示し、収集の達成感を提供する
- スコアが高いほど希少アイテムが出やすい仕組みにする

## 2. 実装範囲

- セッション終了時のアイテムドロップ判定
- UserItem への保存
- ホーム画面またはサブ画面での図鑑表示（取得済み一覧）
- アイテム未取得スロットはシルエット表示（画像なし、名前のみ）

## 3. DBモデル確認

```
Item          : id, key, name, rarity, description, isActive
ThemeItem     : themeId, itemId, dropWeight, unlockLevel
UserItem      : userId, itemId, acquiredAt, acquiredWorkSessionId
```

- `dropWeight` はテーマ内での相対重み（整数）
- `unlockLevel` はユーザーのレベルが達していないと排出されない閾値

## 4. アイテムドロップ判定ロジック

### 4-1. 全体ドロップ判定（ドロップするか否か）

セッション終了時に score に応じてドロップ試行を行う。

```
score < 5  : ドロップなし（実質タイムアウト・極端な短時間）
score >= 5 : 以下の確率テーブルを使用
```

| score 帯   | ドロップ確率 |
|-----------|----------|
| 5 〜 14   | 40%      |
| 15 〜 29  | 65%      |
| 30 〜 44  | 80%      |
| 45 〜 59  | 90%      |
| 60 以上   | 95%      |

### 4-2. レアリティ抽選

ドロップが確定した場合、以下の確率でレアリティを決定する。

| score 帯   | common | rare | epic |
|-----------|--------|------|------|
| 5 〜 14   | 95%    | 5%   | 0%   |
| 15 〜 29  | 88%    | 11%  | 1%   |
| 30 〜 44  | 80%    | 18%  | 2%   |
| 45 〜 59  | 72%    | 24%  | 4%   |
| 60 以上   | 65%    | 28%  | 7%   |

### 4-3. アイテム選択

1. セッションに紐づくフィールドの `themeId` を取得する
2. `ThemeItem` からそのテーマの全アイテムを `dropWeight` 付きで取得する
3. 抽選されたレアリティと一致するアイテムのみを候補にする
4. ユーザーのレベルが `unlockLevel` を満たすアイテムのみを候補にする
5. `dropWeight` を使った重み付きランダムで1件を選ぶ

候補が0件になった場合はドロップなし（スキップ）とする。

### 4-4. 重み付きランダム選択

```typescript
// lib/item-drop.ts に実装する
function selectWeightedRandom<T extends { dropWeight: number }>(
  candidates: T[]
): T | null {
  const totalWeight = candidates.reduce((sum, c) => sum + c.dropWeight, 0);
  if (totalWeight === 0) return null;
  const rand = Math.random() * totalWeight;
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += candidate.dropWeight;
    if (rand < cumulative) return candidate;
  }
  return candidates[candidates.length - 1];
}
```

## 5. セッション終了フローへの組み込み

```
POST /api/sessions/end
  ├── 有効時間・スコア・XP計算（既存）
  ├── アイテムドロップ判定（新規）
  │   ├── determineDrop(score) → boolean
  │   ├── determineRarity(score) → ItemRarity
  │   └── selectItem(themeId, rarity, userLevel) → Item | null
  └── saveEndedWorkSessionForUser（トランザクション）
       ├── WorkSession 保存（既存）
       ├── Field 累計更新（既存）
       ├── User.totalXp 更新（既存）
       └── UserItem 作成（新規、ドロップがあった場合のみ）
```

## 6. レスポンス拡張

`SaveEndedWorkSessionResponse` にアイテム情報を追加する。

```typescript
// src/types/api.ts
type SaveEndedWorkSessionResponse = {
  effectiveSeconds: number;
  score: number;
  xpGained: number;
  droppedItem: {
    id: string;
    key: string;
    name: string;
    rarity: ItemRarity;
    description: string;
  } | null;
};
```

## 7. 図鑑画面

### 表示仕様

- ルート：`/collection` または ホーム画面内タブ切り替え
- テーマ別にグループ表示する
- 取得済みアイテム：名前・レアリティ・説明文を表示
- 未取得アイテム：「???」のシルエット表示（画像なし）
- 取得個数 / 全個数 のカウント表示

### 必要なAPI

```
GET /api/collection
  → ユーザーの UserItem 一覧 + 全 Item 一覧（取得済みフラグ付き）
```

### レスポンス型

```typescript
type CollectionResponse = {
  themes: Array<{
    themeKey: ThemeKey;
    themeDisplayName: string;
    items: Array<{
      id: string;
      key: string;
      name: string;
      rarity: ItemRarity;
      description: string;
      isAcquired: boolean;
      acquiredAt: string | null;
    }>;
  }>;
};
```

## 8. 責務分離

| ファイル | 責務 |
|---------|------|
| `src/lib/item-drop.ts` | ドロップ判定・レアリティ抽選・重み付き選択の純粋計算 |
| `src/server/repositories/item-repository.ts` | ThemeItem・UserItem の DB アクセス |
| `src/app/api/sessions/end/route.ts` | ドロップ結果をトランザクションに統合 |
| `src/app/api/collection/route.ts` | 図鑑データの取得 |
| `src/types/api.ts` | レスポンス型の拡張 |

## 9. シードデータ方針

各テーマに common 5種・rare 3種・epic 1種のアイテムを最低限用意する。
`prisma/seed.ts` に追記する形で実装する。

## 10. 今回見送るもの

- アイテム画像・ドット絵
- 獲得演出（アニメーション）
- アイテム複数枚所持のカウント（取得済み/未取得の2値で十分）
- アイテム交換・売却機能
- レア度以外のフィルタリング
