import {
  AuthRegistrationError,
  type AuthRegistrationInput,
  registerAuthAccount,
} from "@/shared/auth/registration";

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string";
}

function isRegistrationInput(value: unknown): value is AuthRegistrationInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const input = value as Record<string, unknown>;

  return (
    typeof input.username === "string" &&
    typeof input.password === "string" &&
    isOptionalString(input.email) &&
    isOptionalString(input.phone)
  );
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => undefined);

  if (!isRegistrationInput(input)) {
    return Response.json(
      { message: "회원가입 입력값을 확인하세요." },
      { status: 400 },
    );
  }

  try {
    await registerAuthAccount({
      username: input.username,
      password: input.password,
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    });

    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthRegistrationError) {
      return Response.json(
        { message: error.message },
        { status: error.status },
      );
    }

    return Response.json(
      {
        message:
          "인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.",
      },
      { status: 502 },
    );
  }
}
