# Codex プロンプト: ログイン機能のセットアップ

---

以下をそのままコピーしてCodexに貼る。

---

## プロンプト本文

```
以下のドキュメントを読んで、ログイン機能を実装してください。

## 読むべきドキュメント（この順番で）

1. docs/project/coding-standards.md
2. docs/project/architecture.md
3. docs/tasks/task-login-setup.md  ← メインの作業指示

## 作業内容

docs/tasks/task-login-setup.md に記載された「1. dev ログインの実装」を実装してください。

具体的には以下のファイルを変更します：
- src/lib/auth-options.ts
- src/app/login/page.tsx
- src/server/repositories/user-repository.ts

## 注意事項

- docs/tasks/task-login-setup.md の「完了条件」を全て満たすこと
- 変更は最小差分で行うこと（既存コードの責務を壊さない）
- 実装後に変更したファイルと各ファイルの責務を説明すること
- `npm run build` と `npm run lint` が通ることを確認すること

## やらないこと

- GitHub OAuth App の作成（.env への値の記入は人間が手動で行う）
- Phase 0〜6 の他のタスク（このタスクはログインのみ）
```
