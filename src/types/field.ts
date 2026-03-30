export type ThemeKey = string;

export type Theme = {
  id: string;
  key: ThemeKey;
  displayName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Field = {
  id: string;
  userId: string;
  name: string;
  themeId: string;
  themeKey: ThemeKey;
  themeDisplayName: string;
  isPublic: boolean;
  totalEffectiveSeconds: number;
  totalSessions: number;
};
