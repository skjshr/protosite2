import type {
  CreateFieldRequest,
  HomeDataResponse,
  SaveEndedSessionRequest,
  SaveEndedSessionResponse,
} from "@/types/api";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // Keep the default message when JSON parse fails.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchHomeData(): Promise<HomeDataResponse> {
  const response = await fetch("/api/home-data", { method: "GET" });
  return parseJsonResponse<HomeDataResponse>(response);
}

export async function createFieldRequest(
  payload: CreateFieldRequest,
): Promise<void> {
  const response = await fetch("/api/fields", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await parseJsonResponse<{ id: string }>(response);
}

export async function saveEndedSessionRequest(
  payload: SaveEndedSessionRequest,
): Promise<SaveEndedSessionResponse> {
  const response = await fetch("/api/sessions/end", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<SaveEndedSessionResponse>(response);
}
