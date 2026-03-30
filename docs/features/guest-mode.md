# ゲストモード 機能設計

## 概要

ログインなしでタイマーを試せる「ゲストモード」を提供する。
操作体験はログイン済みユーザーと同等だが、データは保存されない。

## ゲストができること・できないこと

| 機能 | ゲスト | ログイン済み |
|------|--------|------------|
| タイマー開始/休憩/再開/終了 | ✅ | ✅ |
| スコア・有効時間の確認 | ✅ | ✅ |
| フィールド選択 | ❌（固定） | ✅ |
| セッション記録の保存 | ❌ | ✅ |
| XP・レベル表示 | ❌ | ✅ |
| アイテムドロップ | ❌ | ✅ |
| 図鑑 | ❌ | ✅ |
| ランキング | ❌ | ✅ |
| フィールド作成 | ❌ | ✅ |

## UI上の扱い

- ページ上部に「ゲストモード」バナーを表示する
  - 「記録を残すには[ログイン]してください」
- フィールド選択は出さない（「ゲストセッション」固定）
- セッション結果は同じ画面にインライン表示する
- 結果表示後、「ログインして記録を保存する」CTAを出す
- XP・レベル・アイテム・ランキングのセクションは非表示

## ミドルウェアの変更

```
変更前: 未認証 → /login へリダイレクト
変更後: 未認証 → / はそのまま通す（ゲストとして表示）
        未認証 → /onboarding は /login へリダイレクト（変わらず）
```

## セッション終了時の処理分岐

```typescript
// page.tsx のセッション終了ハンドラ
if (session) {
  // ログイン済み：APIを呼んでDBに保存
  const result = await saveEndedWorkSessionRequest(payload);
  setSessionResult(result);
} else {
  // ゲスト：ローカルで計算して表示するだけ
  const rawScore = calculateRawSessionScore(effectiveSeconds, pauseAccumulatedSeconds);
  const guestResult = {
    effectiveSeconds,
    score: roundScoreForDisplay(rawScore),
    xpGained: calculateXpFromRawScore(rawScore),
    droppedItem: null,
    isGuest: true,
  };
  setSessionResult(guestResult);
}
```

## データフロー

```
ゲスト
  → page.tsx（useState でセッション管理）
  → lib/work-session.ts（状態遷移）
  → lib/scoring.ts（スコア計算）
  → 結果を sessionResult に格納（API呼び出しなし）
  → 表示のみ

ログイン済み
  → page.tsx（useState でセッション管理）
  → lib/work-session.ts（状態遷移）
  → POST /api/sessions/end
  → 結果を sessionResult に格納
  → 表示
```

## ゲストバナー表示仕様

```
┌─────────────────────────────────────────────────┐
│ ゲストモードで体験中 — 記録を残すには ログイン    │
└─────────────────────────────────────────────────┘
```

- 常にページ最上部に表示（セッション中も）
- ログインリンクはクリックで `/login` へ遷移
- セッション中にクリックしてもページ離脱の警告は不要（MVPでは省略）

## robots.txt との関係

ゲストモードでアクセスできる `/` はクロール対象になりうる。
`robots.txt` で `/api/` と `/onboarding` を除外し、`/` と `/login` は許可する。
