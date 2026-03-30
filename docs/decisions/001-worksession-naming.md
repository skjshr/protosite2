# 001: WorkSession という命名を採用した理由

## 決定

作業セッションのドメインモデルを `Session` ではなく `WorkSession` と命名する。

## 理由

- NextAuth が認証セッションに `Session` という型を使用している
- 同一コードベースで `Session` が2つの意味を持つと混乱を招く
- `WorkSession` とすることで「作業に関するセッション」と明確に区別できる

## トレードオフ

- タイプ数が増える
- 命名が長くなる

コーディング規約「短さより明快さ」に従いこれを許容する。

## 適用範囲

- Prisma モデル名：`WorkSession`
- TypeScript 型：`ActiveWorkSession`、`EndedWorkSession`
- ファイル名：`work-session.ts`、`work-session-repository.ts`
- APIパス：`/api/sessions/end`（sessions は短縮形として許容）
