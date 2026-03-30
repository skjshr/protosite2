# テスト設計方針

## テストの優先順位

MVP段階では**純粋計算ロジック**を最優先にテストする。
UIのテストは後回し。E2Eは当面不要。

| 優先度 | 対象 | 理由 |
|--------|------|------|
| 高 | `src/lib/` の全関数 | 副作用なし・テスト容易・バグの影響大 |
| 中 | `src/server/services/` | ユースケースロジックの正確性 |
| 低 | APIルート | リポジトリのモックが複雑になる |
| 対象外 | UIコンポーネント | MVPでは見た目より機能を優先 |

## テスト対象ファイルと観点

### src/lib/scoring.ts

| テストケース | 確認内容 |
|------------|---------|
| 有効時間 0秒 | スコア = 0 |
| 有効時間 9分59秒 | スコア = 0（10分未満は乗数0） |
| 有効時間 10分 | スコア > 0 |
| 有効時間 52分（推奨帯中央） | 最高倍率が適用される |
| 有効時間 121分 | 低倍率（0.35）が適用される |
| 休憩 0分 | 休憩乗数 0.95 |
| 休憩 7分（推奨帯中央） | 休憩乗数 1.05 |
| 休憩 25分 | 休憩乗数 0.9 |
| XP = floor(score) | 小数切り捨て確認 |

### src/lib/work-session.ts

| テストケース | 確認内容 |
|------------|---------|
| createWorkSession | startedAt が設定される・status = working |
| pauseWorkSession | pausedAt が設定される・status = paused |
| resumeWorkSession | pauseAccumulatedSeconds に休憩時間が加算される |
| calculateCurrentEffectiveSeconds（作業中） | now - startedAt - accumulated |
| calculateCurrentEffectiveSeconds（休憩中） | pausedAt - startedAt - accumulated |
| endWorkSession | effectiveSeconds・score・xp が計算される |

### src/lib/level.ts

| テストケース | 確認内容 |
|------------|---------|
| totalEffectiveSeconds = 0 | Lv 1 |
| 1000時間 = 3,600,000秒 | Lv 70（±1許容） |
| 5000時間 = 18,000,000秒 | Lv 100（±1許容） |
| secondsForLevel(1) | 0 |
| secondsForLevel(n) < secondsForLevel(n+1) | 単調増加 |
| progressRate | 0.0〜1.0 の範囲内 |

### src/lib/item-drop.ts（実装後に追加）

| テストケース | 確認内容 |
|------------|---------|
| score < 5 | ドロップなし |
| determineDrop の確率 | 統計的検証（1000回試行で誤差5%以内） |
| 候補が0件 | null を返す |
| 重み付きランダム | 重みに比例した出現率 |

### src/lib/week.ts（実装後に追加）

| テストケース | 確認内容 |
|------------|---------|
| 月曜日の入力 | その日の00:00:00 UTC |
| 日曜日の入力 | 前の月曜の00:00:00 UTC |
| 週の終了日時 | 開始+7日 |

## テストフレームワーク

未導入。以下を推奨。

```json
// devDependencies に追加
"vitest": "^1.x",
"@vitest/coverage-v8": "^1.x"
```

### 最小限の設定

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

### テストファイルの配置

```
src/lib/scoring.ts        → src/lib/scoring.test.ts
src/lib/work-session.ts  → src/lib/work-session.test.ts
src/lib/level.ts          → src/lib/level.test.ts
```

## テストを書く際の注意点

- `src/lib/` の関数は純粋関数なので、モック不要でテストできる
- 時刻を引数で受け取る設計（`endWorkSession(session, now)`）になっているため、
  `now` に固定値を渡せばテストが安定する
- 確率系のテストは決定論的に書けないため、大量試行で統計的に検証する
- DB・Prisma を使うテストは MVP では書かない
