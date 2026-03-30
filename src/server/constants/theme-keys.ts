export const SYSTEM_THEME_KEYS = ["miner", "fisher", "collector"] as const;

export type SystemThemeKey = (typeof SYSTEM_THEME_KEYS)[number];
