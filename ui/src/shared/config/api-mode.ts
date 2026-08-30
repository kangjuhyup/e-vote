export type ApiMode = "live" | "mock";

export function resolveApiMode(
  value = process.env.NEXT_PUBLIC_VOTE_API_MODE,
): ApiMode {
  return value === "mock" ? "mock" : "live";
}

export function isApiMockMode() {
  return resolveApiMode() === "mock";
}
