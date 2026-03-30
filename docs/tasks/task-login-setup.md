# タスク: ログイン機能のセットアップ

## 概要

以下の2つを同時に実装する。

1. **dev ログインの復活**（Credentials プロバイダ）
2. **GitHub OAuth の組み込み**（Client ID/Secret は .env から読む）

## 実装前に読むこと

- `docs/project/coding-standards.md`
- `docs/project/architecture.md`
- `src/lib/auth-options.ts`（現状確認）
- `src/app/login/page.tsx`（現状確認）
- `.env`（環境変数の確認）

---

## 1. dev ログインの実装

### 背景

`.env` に以下が設定されているが、`auth-options.ts` に `CredentialsProvider` が存在しないため機能していない。
これを実装して dev/devpass でログインできるようにする。

```env
DEV_LOGIN_ENABLED="true"
DEV_LOGIN_USERNAME="dev"
DEV_LOGIN_PASSWORD="devpass"
```

### 1-1. auth-options.ts の変更

`buildProviders()` 関数内に `CredentialsProvider` を追加する。

```typescript
import CredentialsProvider from "next-auth/providers/credentials";

// buildProviders() 内に追加
const devLoginEnabled = process.env.DEV_LOGIN_ENABLED === "true";
const devUsername = process.env.DEV_LOGIN_USERNAME;
const devPassword = process.env.DEV_LOGIN_PASSWORD;

if (devLoginEnabled && devUsername && devPassword) {
  providers.push(
    CredentialsProvider({
      id: "dev-credentials",
      name: "開発用ログイン",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === devUsername &&
          credentials?.password === devPassword
        ) {
          // dev ユーザーを DB から取得または作成する
          const dbUser = await findOrCreateDevUser(devUsername);
          return {
            id: dbUser.id,
            name: devUsername,
            email: null,
            onboardingCompleted: dbUser.onboardingCompleted,
          };
        }
        return null;
      },
    }),
  );
}
```

**`findOrCreateDevUser` の実装**

`src/server/repositories/user-repository.ts` に追加する。

```typescript
export async function findOrCreateDevUser(username: string): Promise<User> {
  // dev ユーザーは username で識別する
  const normalized = username.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { usernameNormalized: normalized },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      username,
      usernameNormalized: normalized,
      onboardingCompleted: true, // dev ユーザーはオンボーディングをスキップ
    },
  });
}
```

**signIn コールバックの修正**

CredentialsProvider は `account.provider === "credentials"` になる。
`profile` が存在しないため、現在の `if (!profile) return false` にひっかかる。
Credentials の場合は `resolveUserByOAuthProfile` をスキップして `return true` にする。

```typescript
async signIn({ user, account, profile }) {
  // Credentials プロバイダは OAuth フローを通らないためスキップ
  if (!account || account.provider === "dev-credentials") {
    return true;
  }

  if (!profile) {
    return false;
  }

  // 以降は既存の OAuth 処理
  ...
}
```

### 1-2. login/page.tsx の変更

dev ログイン用のフォームを追加する。
`DEV_LOGIN_ENABLED` はサーバー環境変数のためクライアントから直接読めない。
ビルド時に埋め込む `NEXT_PUBLIC_DEV_LOGIN_ENABLED` を追加するか、
または**常にフォームを表示して `authorize` 側で弾く**方針にする。

シンプルにするため、**フォームは常に表示し authorize で弾く**方針とする。

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDevLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await signIn("dev-credentials", {
      username,
      password,
      redirect: false,
    });
    if (result?.error) {
      setError("ユーザー名またはパスワードが違います");
    } else {
      window.location.href = "/";
    }
  }

  return (
    <main className="container">
      <section className="panel">
        <h1>ログイン</h1>

        {/* OAuth ボタン */}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <button onClick={() => signIn("google", { callbackUrl: "/" })}>
            Google でログイン
          </button>
          <button onClick={() => signIn("github", { callbackUrl: "/" })}>
            GitHub でログイン
          </button>
          <button onClick={() => signIn("twitter", { callbackUrl: "/" })}>
            X (Twitter) でログイン
          </button>
        </div>

        {/* dev ログインフォーム */}
        <hr style={{ margin: "1.5rem 0" }} />
        <p style={{ fontSize: "0.85rem", color: "#888" }}>開発用ログイン</p>
        <form onSubmit={handleDevLogin} style={{ display: "grid", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>}
          <button type="submit">ログイン</button>
        </form>
      </section>
    </main>
  );
}
```

---

## 2. GitHub OAuth の組み込み

### 背景

`auth-options.ts` の `buildProviders()` には既に `GitHubProvider` の条件分岐が実装されている。
`.env` の `GITHUB_CLIENT_ID` と `GITHUB_CLIENT_SECRET` を埋めるだけで動く。

**この実装タスクでは .env の値は埋めない。**
GitHub OAuth App の作成は人間が手動で行う（手順は下記）。
Codex がやることは `GitHubProvider` の実装が正しく動作することの確認のみ。

### 2-1. GitHub OAuth App の作成（人間が手動で実施）

1. GitHub → 右上アイコン → Settings → Developer settings → OAuth Apps → **New OAuth App**
2. 以下を入力：
   - Application name: `excavation-app-dev`（任意）
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. **Register application** をクリック
4. 発行された **Client ID** と **Client Secret** をコピー
5. `.env` に貼る：
   ```env
   GITHUB_CLIENT_ID="発行されたClient ID"
   GITHUB_CLIENT_SECRET="発行されたClient Secret"
   ```
6. 開発サーバーを再起動（`npm run dev`）

### 2-2. Codex が確認すること

`auth-options.ts` の GitHub プロバイダ部分が以下を満たしていることを確認する。
満たしていなければ修正する。

```typescript
// ✅ 確認ポイント
// 1. GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET が空の場合はプロバイダを登録しない（既存）
// 2. signIn コールバックで GitHub の profile からメールを取得できる
//    （GitHub はメールが非公開設定の場合 null になることがある）
// 3. GitHub でメールが取得できない場合のエラーハンドリングが存在する
```

GitHub は `profile.email` が `null` になるケースがある（メール非公開設定ユーザー）。
その場合 `resolveUserByOAuthProfile` がエラーを返す可能性があるため、
`signIn` コールバックで適切に `return "/login?error=EmailRequired"` などにフォールバックする。

---

## 完了条件

- [ ] `dev` / `devpass` でログインできる
- [ ] ログイン後 `/onboarding` または `/` に遷移する
- [ ] dev ユーザーは DB に作成される（`onboardingCompleted: true`）
- [ ] `.env` に GitHub の Client ID/Secret を設定した状態で GitHub ログインが動く
- [ ] `npm run build` が通る
- [ ] `npm run lint` が通る

## 変更するファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/auth-options.ts` | CredentialsProvider 追加・signIn コールバック修正 |
| `src/app/login/page.tsx` | dev ログインフォーム追加 |
| `src/server/repositories/user-repository.ts` | `findOrCreateDevUser` 追加 |

## 注意

- `findOrCreateDevUser` は `server/repositories/` に置く（lib ではない）
- dev ログインは `onboardingCompleted: true` で作成する（オンボーディングをスキップ）
- `CredentialsProvider` は JWT セッションのみ対応。`session: { strategy: "jwt" }` が `authOptions` に設定されていることを確認する（未設定なら追加する）
