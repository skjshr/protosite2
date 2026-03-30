import type {
  CollectionResponse,
  CreateFieldRequest,
  HomeDataResponse,
  RankingResponse,
  SaveEndedWorkSessionRequest,
  SaveEndedWorkSessionResponse,
} from "@/types/api";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = "Request failed.";

    try {
      const errorBody = (await response.json()) as { error?: string; message?: string };
      if (typeof errorBody.error === "string") {
        message = errorBody.error;
      } else if (typeof errorBody.message === "string") {
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

export async function createFieldRequest(payload: CreateFieldRequest): Promise<void> {
  const response = await fetch("/api/fields", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  await parseJsonResponse<{ ok: true }>(response);
}

export async function saveEndedWorkSessionRequest(
  payload: SaveEndedWorkSessionRequest,
): Promise<SaveEndedWorkSessionResponse> {
  const response = await fetch("/api/sessions/end", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<SaveEndedWorkSessionResponse>(response);
}

export async function fetchCollection(): Promise<CollectionResponse> {
  const response = await fetch("/api/collection", { method: "GET" });
  return parseJsonResponse<CollectionResponse>(response);
}

export async function fetchRanking(): Promise<RankingResponse> {
  const response = await fetch("/api/ranking", { method: "GET" });
  return parseJsonResponse<RankingResponse>(response);
}
