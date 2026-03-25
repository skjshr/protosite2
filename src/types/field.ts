export type FieldTheme = "miner" | "fisher" | "collector";

export interface Field {
  id: string;
  name: string;
  theme: FieldTheme;
  isPublic: boolean;
}
