import type { Field, FieldTheme } from "@/types/field";

const FIELDS_STORAGE_KEY = "fields";

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined";
}

function isValidFieldTheme(theme: unknown): theme is FieldTheme {
  return theme === "miner" || theme === "fisher" || theme === "collector";
}

function isValidField(value: unknown): value is Field {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    isValidFieldTheme(candidate.theme) &&
    typeof candidate.isPublic === "boolean"
  );
}

function normalizeFields(value: unknown): Field[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isValidField);
}

export function loadFields(): Field[] {
  if (!isBrowserEnvironment()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(FIELDS_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return normalizeFields(parsedValue);
  } catch {
    return [];
  }
}

export function createField(
  fields: Field[],
  input: {
    name: string;
    theme: FieldTheme;
    isPublic: boolean;
  },
): Field[] {
  if (!isBrowserEnvironment()) {
    return fields;
  }

  const nextField: Field = {
    id: crypto.randomUUID(),
    name: input.name,
    theme: input.theme,
    isPublic: input.isPublic,
  };

  const nextFields = [...fields, nextField];
  window.localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(nextFields));
  return nextFields;
}
