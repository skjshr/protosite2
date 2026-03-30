# 002: ThemeKey を Prisma enum から String へ変更する

## 状況

初期実装で `ThemeKey` を Prisma enum として定義した。

```prisma
enum ThemeKey { miner, fisher, collector }
```

## 問題

- テーマを追加するたびに Prisma マイグレーションが必要になる
- 将来的に課金ユーザーがテーマを動的に作成できる仕組みを作れない
- enum は DB レベルで型を固定するため、テーマの拡張性が著しく低い

## 決定

`ThemeKey` enum を削除し、`Theme.key` を `String @unique` として扱う。

### スキーマ変更後

```prisma
// enum ThemeKey は削除
model Theme {
  key           String  @unique
  creatorUserId String? // null = システムテーマ
  isUserCreated Boolean @default(false)
  // ...
}
```

### TypeScript 型変更後

```typescript
// 変更前
type ThemeKey = "miner" | "fisher" | "collector"

// 変更後
type ThemeKey = string
```

## トレードオフ

- TypeScript の型安全性が下がる（システムテーマのリテラル型が消える）
- 対策：システムテーマのキーは定数として管理する

```typescript
// src/server/constants/theme-keys.ts
export const SYSTEM_THEME_KEYS = ['miner', 'fisher', 'collector'] as const;
export type SystemThemeKey = typeof SYSTEM_THEME_KEYS[number];
```

## 実施タイミング

テーマ追加・ユーザー作成テーマの実装前に対応する。
既存データへの影響：`Field.themeKey` 列（もし存在する場合）を確認してから実施。
