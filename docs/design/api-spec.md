# API仕様書

## 概要

全エンドポイントは認証に NextAuth のセッションクッキーを使用する。
認証不要のエンドポイントは「認証」欄に「不要」と記載する。

---

## 認証系

### NextAuth ハンドラ

```
GET  /api/auth/[...nextauth]
POST /api/auth/[...nextauth]
```

- NextAuth が自動生成するハンドラ
- サインイン・サインアウト・コールバックを処理する

---

## ユーザー系

### POST /api/user/onboarding

ユーザー名を初回設定する（オンボーディング完了）。

**認証：** 必要（onboarding 未完了ユーザーのみ）

**リクエスト**

```json
{ "username": "string" }
```

**バリデーション**

- 4〜20文字
- 使用可能文字：日本語・英数字・アンダースコア・ハイフン

**レスポンス（200）**

```json
{ "ok": true }
```

**エラー**

| コード | 理由 |
|--------|------|
| 400 | バリデーションエラー（形式不正） |
| 409 | ユーザー名重複 |
| 401 | 未認証 |

---

## フィールド系

### GET /api/fields

自分のフィールド一覧を取得する。

**認証：** 必要

**レスポンス（200）**

```json
{
  "fields": [
    {
      "id": "string",
      "userId": "string",
      "name": "string",
      "themeId": "string",
      "themeKey": "miner | fisher | collector",
      "themeDisplayName": "string",
      "isPublic": false,
      "totalEffectiveSeconds": 0,
      "totalSessions": 0
    }
  ]
}
```

### POST /api/fields

フィールドを新規作成する。

**認証：** 必要

**リクエスト**

```json
{
  "name": "string",
  "themeKey": "miner | fisher | collector",
  "isPublic": false
}
```

**レスポンス（201）**

```json
{ "ok": true }
```

**エラー**

| コード | 理由 |
|--------|------|
| 400 | 必須パラメータ不足・themeKey 不正 |
| 404 | 指定 theme が存在しない |
| 401 | 未認証 |

---

## ホームデータ系

### GET /api/home-data

ホーム画面に必要なデータを一括取得する。

**認証：** 必要

**レスポンス（200）**

```json
{
  "fields": [ /* Field の配列 */ ],
  "themes": [
    {
      "id": "string",
      "key": "miner | fisher | collector",
      "displayName": "string",
      "description": "string",
      "sortOrder": 0,
      "isActive": true
    }
  ],
  "summary": {
    "totalXp": 0,
    "totalEffectiveSeconds": 0,
    "level": 1,                        // 追加予定
    "levelProgress": {                 // 追加予定
      "currentLevelXp": 0,
      "nextLevelXp": 100,
      "progressXp": 0,
      "progressRate": 0.0
    }
  },
  "recentWorkSessions": [
    {
      "id": "string",
      "fieldId": "string",
      "fieldName": "string",
      "startedAt": "ISO8601",
      "endedAt": "ISO8601",
      "effectiveSeconds": 0,
      "score": 0.0,
      "xp": 0
    }
  ],
  "fieldTotals": [
    {
      "fieldId": "string",
      "totalEffectiveSeconds": 0,
      "totalSessions": 0
    }
  ]
}
```

---

## セッション系

### POST /api/sessions/end

作業セッションを終了し、DB に保存する。

**認証：** 必要

**リクエスト**

```json
{
  "fieldId": "string",
  "startedAt": "ISO8601",
  "endedAt": "ISO8601",
  "pauseAccumulatedSeconds": 0,
  "pausedAt": "ISO8601 | null"
}
```

**サーバー側計算（クライアントから受け取らない）**

- `effectiveSeconds = endedAt - startedAt - pauseAccumulatedSeconds`
- `score` = スコア計算ロジック（`src/lib/scoring.ts`）
- `xpGained = Math.floor(score)`

**レスポンス（200）**

```json
{
  "effectiveSeconds": 0,
  "score": 0.0,
  "xpGained": 0,
  "droppedItem": {           // 追加予定 (item-reward-system.md 参照)
    "id": "string",
    "key": "string",
    "name": "string",
    "rarity": "common | rare | epic",
    "description": "string"
  },
  "totalXp": 0,              // 追加予定
  "level": 1,                // 追加予定
  "leveledUp": false,        // 追加予定
  "levelProgress": { ... }   // 追加予定
}
```

**エラー**

| コード | 理由 |
|--------|------|
| 400 | 必須パラメータ不足・日時不正 |
| 403 | fieldId が自分のフィールドでない |
| 401 | 未認証 |

---

## 図鑑系（未実装）

### GET /api/collection

ユーザーの図鑑データ（取得済みアイテム一覧 + 全アイテム一覧）を取得する。

**認証：** 必要

**レスポンス（200）**

```json
{
  "themes": [
    {
      "themeKey": "miner",
      "themeDisplayName": "鉱夫",
      "items": [
        {
          "id": "string",
          "key": "string",
          "name": "string",
          "rarity": "common | rare | epic",
          "description": "string",
          "isAcquired": true,
          "acquiredAt": "ISO8601 | null"
        }
      ]
    }
  ]
}
```

---

## ランキング系（未実装）

### GET /api/ranking

近傍ランキングを取得する。

**認証：** 必要

**レスポンス（200）**

```json
{
  "weekStart": "ISO8601",
  "weekEnd": "ISO8601",
  "myRank": 5,
  "myWeeklyScore": 123.4,
  "nearby": [
    {
      "rank": 3,
      "username": "string",
      "weeklyScore": 200.0,
      "isCurrentUser": false
    },
    {
      "rank": 4,
      "username": "string",
      "weeklyScore": 180.5,
      "isCurrentUser": false
    },
    {
      "rank": 5,
      "username": "string",
      "weeklyScore": 123.4,
      "isCurrentUser": true
    },
    {
      "rank": 6,
      "username": "string",
      "weeklyScore": 110.0,
      "isCurrentUser": false
    },
    {
      "rank": 7,
      "username": "string",
      "weeklyScore": 95.0,
      "isCurrentUser": false
    }
  ]
}
```

**myRank が null の場合（今週スコアなし）**

```json
{
  "weekStart": "ISO8601",
  "weekEnd": "ISO8601",
  "myRank": null,
  "myWeeklyScore": 0,
  "nearby": [ /* 上位2件のみ */ ]
}
```

---

## エラーレスポンス共通フォーマット

```json
{ "error": "エラーメッセージ" }
```

全エンドポイントで統一する。

---

## 実装済み / 未実装 ステータス

| エンドポイント | ステータス |
|--------------|----------|
| `POST /api/auth/[...nextauth]` | 実装済み |
| `POST /api/user/onboarding` | 実装済み |
| `GET /api/fields` | 実装済み |
| `POST /api/fields` | 実装済み |
| `GET /api/home-data` | 実装済み（level/levelProgress は未追加） |
| `POST /api/sessions/end` | 実装済み（droppedItem/level は未追加） |
| `GET /api/collection` | **未実装** |
| `GET /api/ranking` | **未実装** |
