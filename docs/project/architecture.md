# アーキテクチャ設計規約

## 1. 技術スタック

| 種別 | 技術 | バージョン |
|------|------|---------|
| フレームワーク | Next.js App Router | 14.x |
| 言語 | TypeScript | 5.x（strict モード） |
| DB | SQLite（開発） | - |
| ORM | Prisma | 6.x |
| 認証 | NextAuth | v4 |
| スタイル | globals.css | MVP。Tailwind は未導入 |

---

## 2. ディレクトリ構成と責務

```
src/
  app/                    UI層・ルーティング
    api/                  APIエンドポイント（入力検証とユースケース起動のみ）
    components/           再利用UIコンポーネント（stateless）
    login/                ログイン画面
    onboarding/           ユーザー名設定画面
    page.tsx              ホーム画面（セッション + コレクション）
    layout.tsx            ルートレイアウト
    globals.css           グローバルスタイル

  lib/                    純粋計算ロジック（副作用なし・テスト可能）
    scoring.ts            スコア・XP計算
    work-session.ts       セッション状態遷移・有効時間計算
    level.ts              レベル・進捗率計算
    item-drop.ts          アイテムドロップ判定・重み付き選択
    week.ts               週の開始・終了日時計算
    time-format.ts        時間表示フォーマット
    api-client.ts         フロント→API 通信関数

  server/                 サーバー専用（Prisma・ビジネスロジック）
    db/client.ts          Prisma クライアントシングルトン
    constants/            サーバー側定数
    repositories/         DBアクセス（Prisma クエリのみ）
    services/             ユースケース（複数リポジトリの組み合わせ）

  types/                  型定義（ロジックなし）
    api.ts                APIリクエスト/レスポンス型
    field.ts              フィールド・テーマ型
    work-session.ts       セッション型
    session-history.ts    履歴・サマリー型
    validation.ts         バリデーション関数（副作用なし）
    next-auth.d.ts        NextAuth 型拡張

  middleware.ts           認証・オンボーディングのリダイレクト制御
```

---

## 3. レイヤー設計

### 3.1 レイヤー構造

```
┌─────────────────────────────────┐
│  app/（UI層）                    │
│  page.tsx / components/         │
└────────────┬────────────────────┘
             │ fetch
┌────────────▼────────────────────┐
│  app/api/（APIルート層）          │
│  入力検証・ユースケース起動のみ     │
└────────────┬────────────────────┘
             │ 呼び出し
┌────────────▼────────────────────┐
│  server/services/（サービス層）   │
│  ユースケース・複数リポジトリ統合  │
└────────────┬────────────────────┘
             │ 呼び出し
┌────────────▼────────────────────┐
│  server/repositories/（DB層）    │
│  Prisma クエリのみ               │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  Prisma / SQLite                │
└─────────────────────────────────┘

lib/（純粋計算層）← 全層から参照可（副作用なし）
types/（型定義）← 全層から参照可（ロジックなし）
```

### 3.2 レイヤー境界ルール

| 呼び出し元 | 呼び出し先 | 許可 | 理由 |
|-----------|-----------|------|------|
| `app/page.tsx` | `lib/` | ✅ | 純粋計算は UI から使ってよい |
| `app/page.tsx` | `server/` | ❌ | サーバー専用コードをクライアントに混ぜない |
| `app/api/` | `server/services/` | ✅ | API ルートはサービスを起動する |
| `app/api/` | `server/repositories/` | ❌ | リポジトリは必ずサービス経由で呼ぶ |
| `server/services/` | `server/repositories/` | ✅ | サービスはリポジトリを組み合わせる |
| `server/repositories/` | `server/services/` | ❌ | 逆方向の依存禁止 |
| `lib/` | `server/` | ❌ | lib は副作用を持たない |
| `lib/` | `app/` | ❌ | lib は UI に依存しない |

---

## 4. 各レイヤーの書き方ルール

### 4.1 APIルート（app/api/）

**役割：入力検証 → サービス呼び出し → レスポンス返却**

```typescript
// ✅ こう書く
export async function POST(request: Request) {
  // 1. 認証確認
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 2. 入力検証（型・必須チェック）
  const body = await request.json();
  if (!body.fieldId || typeof body.fieldId !== "string") {
    return NextResponse.json({ error: "fieldId が不正です" }, { status: 400 });
  }

  // 3. サービス呼び出し（ビジネスロジックはここに書かない）
  const result = await doSomethingForUser(session.user.id, body);

  // 4. レスポンス返却
  return NextResponse.json(result, { status: 200 });
}
```

**書いてはいけないもの：**
- Prisma を直接呼ぶ（`prisma.user.findUnique(...)` など）
- スコア計算などのビジネスロジック
- 複数のDBアクセスを直接並べる

### 4.2 サービス層（server/services/）

**役割：ユースケースの実装・複数リポジトリの統合**

```typescript
// ✅ こう書く
export async function saveEndedWorkSessionForUser(params: SaveParams): Promise<SaveResult> {
  // 1. バリデーション（DB前提の検証）
  const field = await findFieldByIdAndUserId(params.fieldId, params.userId);
  if (!field) throw new Error("フィールドが見つかりません");

  // 2. 計算（lib 関数を使う）
  const effectiveSeconds = calculateEffectiveSeconds(params);
  const rawScore = calculateRawSessionScore(effectiveSeconds, params.pauseAccumulatedSeconds);
  const xpGained = calculateXpFromRawScore(rawScore);

  // 3. 永続化（リポジトリに委ねる）
  return await saveEndedSession({ ...params, effectiveSeconds, rawScore, xpGained });
}
```

**書いてはいけないもの：**
- `NextResponse` を返す（サービスは HTTP を知らない）
- Prisma を直接呼ぶ

### 4.3 リポジトリ層（server/repositories/）

**役割：Prismaクエリの実装**

```typescript
// ✅ こう書く
export async function listFieldsByUserId(userId: string): Promise<Field[]> {
  const records = await prisma.field.findMany({
    where: { userId },
    include: { theme: true },
    orderBy: { createdAt: "asc" },
  });
  return records.map(toFieldType); // DB型 → アプリ型への変換
}
```

**書いてはいけないもの：**
- 計算ロジック（単純な変換以外）
- 複数テーブルを跨ぐビジネスロジック（それはサービス層）
- トランザクション外で複数 write を行う

### 4.4 lib/（純粋計算）

**役割：副作用なしの計算**

```typescript
// ✅ こう書く（引数だけで結果が決まる）
export function calculateLevel(totalEffectiveSeconds: number): number {
  if (totalEffectiveSeconds <= 0) return 1;
  const hours = totalEffectiveSeconds / 3600;
  return Math.floor(LEVEL_COEFFICIENT * Math.pow(hours, LEVEL_EXPONENT)) + 1;
}
```

**書いてはいけないもの：**
- `prisma.*` の呼び出し
- `Date.now()` の直接呼び出し（引数で受け取る）
- `Math.random()` の直接呼び出し（引数または戻り値で分離）
- `fetch()` の呼び出し

---

## 5. DB スキーマ設計規約

### 5.1 モデル設計の原則

- ID は `String @default(cuid())` で統一（連番 Int は使わない）
- 作成日時 `createdAt` と更新日時 `updatedAt` は全モデルに付ける
- 論理削除が必要な場合は `isActive Boolean @default(true)` で表現する
- 外部キーには必ず `@index` を付ける

```prisma
model Field {
  id        String   @id @default(cuid())
  userId    String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

### 5.2 テーマキーの方針

- テーマキーは `String @unique` で管理する（Prisma enum は使わない）
- 理由：テーマを動的に追加できる拡張性を維持するため（decisions/002 参照）
- システムテーマのキー一覧は `src/server/constants/theme-keys.ts` で管理する

### 5.3 マスタテーブルの扱い

- `Theme`, `Item`, `ThemeItem` はマスタデータ
- 変更は `prisma/seed.ts` で管理する（マイグレーションは構造変更のみ）
- 本番データを直接 UPDATE するのは禁止

### 5.4 計算値の保存方針

- `effectiveSeconds`, `score`, `xpGained` はサーバー側で計算した確定値のみ保存する
- フロントから受け取った計算済み値をそのまま保存しない（改ざん防止）

---

## 6. API設計規約

### 6.1 URLルール

| パターン | 例 |
|---------|---|
| リソース名は複数形 | `/api/fields`, `/api/sessions` |
| アクションは動詞サブパス | `/api/sessions/end` |
| ユーザー固有リソースはパスに userId を含めない | IDは認証から取得 |

### 6.2 HTTPメソッドの使い方

| メソッド | 使い方 |
|---------|--------|
| GET | データ取得（副作用なし） |
| POST | 作成・アクション（作成以外も POST でよい） |
| PUT / PATCH | 更新（MVP では POST で代替可） |
| DELETE | 削除（MVP では未使用） |

### 6.3 レスポンス形式

```typescript
// 正常系：データあり
{ "field": { ... } }          // 単体
{ "fields": [ ... ] }         // 一覧
{ "ok": true }                // 成功のみ

// 正常系：ステータスコード
200  通常の成功
201  リソース作成成功（MVP では 200 で統一してもよい）

// 異常系
{ "error": "メッセージ" }

// 異常系：ステータスコード
400  リクエスト不正（バリデーションエラー）
401  未認証
403  権限なし（他人のリソースへのアクセス）
404  リソースが存在しない
409  競合（ユーザー名重複など）
500  サーバーエラー
```

---

## 7. セッション状態管理の原則

- **真実は時刻情報**（`startedAt` / `pausedAt` / `endedAt` / `pauseAccumulatedSeconds`）
- フロントのタイマー表示は `calculateCurrentEffectiveSeconds(session, now)` の返り値であり、状態ではない
- `effectiveSeconds` / `score` / `xpGained` はサーバーで計算して保存する
- フロントはセッション終了まで DB に書かない（メモリ上の `ActiveWorkSession` のみ保持）
- 状態遷移は `idle → working → paused → working → ended` のみ。それ以外は作らない

---

## 8. 認証・認可の設計

### 8.1 認証確認の方法

全 API ルートで `getServerSession(authOptions)` を使う。

```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
  return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
}
const userId = session.user.id; // 以降はこれを使う
```

### 8.2 リソースの所有者確認

他人のリソースへのアクセスをリポジトリ層で防ぐ。

```typescript
// ✅ userId を条件に含める（他人の field を操作できない）
await findFieldByIdAndUserId(fieldId, userId);

// ❌ IDだけで検索してから所有者チェック（競合やバグが起きやすい）
const field = await findFieldById(fieldId);
if (field.userId !== userId) { ... }
```

### 8.3 ミドルウェアの責務

`middleware.ts` は以下のみを担う。

- 未認証 → `/login` へリダイレクト
- 認証済み + onboarding 未完了 → `/onboarding` へリダイレクト
- それ以外の認可チェックは API ルート・サービス層で行う

---

## 9. 拡張時の判断基準

### 9.1 新しいファイルを作るか、既存に追加するか

| 状況 | 判断 |
|------|------|
| 既存ファイルの責務と一致する | 既存ファイルに追加 |
| 新しい概念・ドメインが生まれる | 新しいファイルを作る |
| 1ファイルが200行を超えてきた | 分割を検討 |
| テストが書きにくくなってきた | 分割のサイン |

### 9.2 新しいテーマを追加するとき

1. `prisma/seed.ts` に `Theme` レコードを追加する
2. `Item` と `ThemeItem` のシードデータを追加する
3. スキーマ変更は不要（ThemeKey は String）
4. フロントのコレクションタブは自動で増える（ユーザーがそのテーマのフィールドを持てば）

### 9.3 新しいAPIエンドポイントを追加するとき

1. `docs/design/api-spec.md` を先に更新する
2. `src/types/api.ts` に型を追加する
3. リポジトリ → サービス → APIルートの順で実装する
4. 完了後に `api-spec.md` の実装状況を「実装済み」に更新する
