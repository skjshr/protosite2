import type { FieldTheme } from "@/types/field";

export function getThemeLabel(theme: FieldTheme): string {
  if (theme === "miner") {
    return "Miner";
  }
  if (theme === "fisher") {
    return "Fisher";
  }
  return "Collector";
}

export function getThemeDescription(theme: FieldTheme): string {
  if (theme === "miner") {
    return "コツコツ掘り進める学習テーマ";
  }
  if (theme === "fisher") {
    return "波を見て集中する学習テーマ";
  }
  return "幅広く集めて進める学習テーマ";
}
