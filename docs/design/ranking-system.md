# 近傍ランキング 詳細設計

## 1. 目的

- 全体ではなく「前後2人だけ」を表示する近傍ランキングを実装する
- 週次スコアを基準にすることで、長時間作業より効率的な作業リズムを推奨する
- 自分の位置を意識させつつ、圧倒的な差による意欲喪失を防ぐ

## 2. 実装範囲

- 週次スコアの集計（Sunday 00:00 〜 Saturday 23:59:59 UTC）
- ランキング順位の決定
- 自分を中心に上位2人・下位2人の最大5件を表示
- `GET /api/ranking` エンドポイント

## 3. 週次スコアの定義

```
週次スコア = 当週 ( endedAt が今週の月曜 00:00 〜 日曜 23:59:59 UTC ) の
             WorkSession.score の合計
```

- `WorkSession.status = 'ended'` かつ `WorkSession.score IS NOT NULL` のもの
- 週の区切りは **月曜始まり（ISO 8601）** で統一する

### 週の開始日時の計算

```typescript
// src/lib/week.ts

function getCurrentWeekStartUtc(now: Date): Date {
  const d = new Date(now);
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getCurrentWeekEndUtc(weekStart: Date): Date {
  const d = new Date(weekStart);
  d.setUTCDate(d.getUTCDate() + 7);
  return d; // exclusive upper bound
}
```

## 4. ランキング集計クエリ

```typescript
// src/server/repositories/ranking-repository.ts

async function getRankingWithWeeklyScores(
  weekStart: Date,
  weekEnd: Date,
): Promise<Array<{ userId: string; username: string; weeklyScore: number }>> {
  // WorkSession を集計し、ユーザーごとの週次スコアを返す
  const results = await prisma.workSession.groupBy({
    by: ['userId'],
    where: {
      status: 'ended',
      endedAt: { gte: weekStart, lt: weekEnd },
      score: { not: null },
    },
    _sum: { score: true },
    orderBy: { _sum: { score: 'desc' } },
  });

  // username を取得するために User を結合する
  // groupBy で JOIN できないため、userId リストで User を別クエリ取得する
  const userIds = results.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });

  const userMap = new Map(users.map((u) => [u.id, u.username]));

  return results.map((r) => ({
    userId: r.userId,
    username: userMap.get(r.userId) ?? 'unknown',
    weeklyScore: r._sum.score ?? 0,
  }));
}
```

## 5. 近傍抽出ロジック

```typescript
// src/server/services/ranking-service.ts

type RankingEntry = {
  rank: number;
  userId: string;
  username: string;
  weeklyScore: number;
  isCurrentUser: boolean;
};

function extractNearbyRanking(
  allRanking: Array<{ userId: string; username: string; weeklyScore: number }>,
  currentUserId: string,
  neighborCount: number = 2,
): RankingEntry[] {
  const ranked = allRanking.map((entry, index) => ({
    rank: index + 1,
    ...entry,
    isCurrentUser: entry.userId === currentUserId,
  }));

  const myIndex = ranked.findIndex((r) => r.userId === currentUserId);

  if (myIndex === -1) {
    // 今週のスコアがない場合：最上位 2件 + 自分（rank=null扱い）を返す
    return ranked.slice(0, neighborCount);
  }

  const start = Math.max(0, myIndex - neighborCount);
  const end = Math.min(ranked.length, myIndex + neighborCount + 1);
  return ranked.slice(start, end);
}
```

### 自分の週次スコアが 0 またはランク外の場合

- ランキングには掲載しない（集計クエリに含まれない）
- レスポンスの `myRank` を `null` とする
- 上位2人のみ表示する

## 6. APIエンドポイント

```
GET /api/ranking
```

### レスポンス型

```typescript
// src/types/api.ts

type RankingEntry = {
  rank: number;
  username: string;
  weeklyScore: number;
  isCurrentUser: boolean;
};

type RankingResponse = {
  weekStart: string;       // ISO 8601 UTC
  weekEnd: string;         // ISO 8601 UTC
  myRank: number | null;   // ランク外の場合 null
  myWeeklyScore: number;
  nearby: RankingEntry[];  // 最大5件（上2・自分・下2）
};
```

## 7. ホーム画面への統合

- ランキングはホーム画面に折りたたみ表示（アコーディオン）またはセクションとして配置する
- 初回ロード時に `/api/ranking` を呼ぶか、`/api/home-data` に統合するかは実装時に判断する
- MVP では `/api/ranking` を別途呼び出す方式を推奨（home-data の応答を肥大化させない）

## 8. 責務分離

| ファイル | 責務 |
|---------|------|
| `src/lib/week.ts` | 週の開始・終了日時の純粋計算 |
| `src/server/repositories/ranking-repository.ts` | 週次スコア集計の DB クエリ |
| `src/server/services/ranking-service.ts` | 近傍抽出ロジック |
| `src/app/api/ranking/route.ts` | エンドポイント・認証確認・レスポンス組み立て |
| `src/types/api.ts` | `RankingResponse` 型の追加 |

## 9. パフォーマンス注意点

- `groupBy` + 別クエリの2段構えになるが、MVP のユーザー数規模では問題ない
- 将来的にユーザー数が増えた場合はマテリアライズドビューや定期集計テーブルを検討する
- 現時点では対応不要

## 10. 今回見送るもの

- 全体ランキング表示（上位100件など）
- フィールド別ランキング
- 月次・全期間ランキング
- ランキング変動のアニメーション
- 順位変動の通知
