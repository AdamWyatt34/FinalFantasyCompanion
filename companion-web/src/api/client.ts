import type {
  AdvanceImpact,
  Availability,
  GameSummary,
  Pack,
  RouteView,
  StateSnapshot,
} from "./types";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getGames: () => getJson<GameSummary[]>("/api/games"),
  getPack: (gameId: string) => getJson<Pack>(`/api/games/${gameId}/pack`),
  getAvailability: (gameId: string) =>
    getJson<Availability>(`/api/games/${gameId}/availability`),
  getRoute: (gameId: string) =>
    getJson<RouteView>(`/api/games/${gameId}/route`),
  getAdvanceImpact: (gameId: string, to: number) =>
    getJson<AdvanceImpact>(`/api/games/${gameId}/advance-impact?to=${to}`),
  postEvent: (
    gameId: string,
    event: { type: string; to?: number; itemId?: string },
  ) => postJson<StateSnapshot>(`/api/games/${gameId}/events`, event),
  postReset: (gameId: string) =>
    postJson<StateSnapshot & { archivedTo: string | null }>(
      `/api/games/${gameId}/reset`,
    ),
};
