export type FieldTheme = "miner" | "fisher" | "collector";

export interface Field {
  id: string;
  userId: string;
  name: string;
  theme: FieldTheme;
  isPublic: boolean;
}
