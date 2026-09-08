import {
  AuthRegistrationError,
  type AuthRegistrationInput,
  registerAuthAccount,
  registerVoteProfile,
} from '@/shared/auth/registration';

function isRegistrationInput(value: unknown): value is AuthRegistrationInput {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const input = value as Record<string, unknown>;

  return (
    typeof input.username === 'string' &&
    typeof input.password === 'string' &&
    typeof input.name === 'string' &&
    input.name.trim().length > 0 &&
    typeof input.email === 'string' &&
    input.email.trim().length > 0 &&
    typeof input.phone === 'string' &&
    input.phone.trim().length > 0
  );
}

export async function POST(request: Request) {
  const input = await request.json().catch(() => undefined);

  if (!isRegistrationInput(input)) {
    return Response.json(
      { message: '회원가입 입력값을 확인하세요.' },
      { status: 400 },
    );
  }

  try {
    const account = await registerAuthAccount(input);
    await registerVoteProfile({ ...input, userPrincipalId: account.userId });

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
        message: '회원가입을 완료하지 못했습니다. 잠시 후 다시 시도하세요.',
      },
      { status: 502 },
    );
  }
}
