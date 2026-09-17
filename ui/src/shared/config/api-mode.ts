export type ApiMode = "live" | "mock";

export function resolveApiMode(
  value = process.env.NEXT_PUBLIC_VOTE_API_MODE,
): ApiMode {
  if (process.env.NODE_ENV === 'production' && value === 'mock') {
    throw new TypeError('NEXT_PUBLIC_VOTE_API_MODE=mock is development-only');
  }
  return value === "mock" ? "mock" : "live";
}

export function isApiMockMode() {
  return resolveApiMode() === "mock";
}
