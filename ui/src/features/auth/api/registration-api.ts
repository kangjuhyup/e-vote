import type { SignUpInput } from "@/features/auth/model/auth.types";

type RegistrationFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

async function readErrorMessage(response: Response) {
  const payload = (await response.json().catch(() => undefined)) as
    | { message?: unknown }
    | undefined;

  return typeof payload?.message === "string"
    ? payload.message
    : "회원가입 요청을 처리하지 못했습니다.";
}

export async function registerAccount(
  input: SignUpInput,
  fetcher: RegistrationFetcher = fetch,
) {
  const response = await fetcher("/api/registration", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}
