import Link from 'next/link';
import { LoaderCircle, ShieldCheck, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { SignUpDraft } from '@/features/auth/model/auth.types';

interface SignUpFormProps {
  draft: SignUpDraft;
  error?: string;
  isPending: boolean;
  loginHref?: string;
  onFieldChange: (field: keyof SignUpDraft, value: string) => void;
  onSubmit: () => void;
}

export function SignUpForm({
  draft,
  error,
  isPending,
  loginHref = '/',
  onFieldChange,
  onSubmit,
}: SignUpFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-accent/55 to-transparent"
      />
      <Card className="relative w-full max-w-lg rounded-xl shadow-lg shadow-primary/5">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <UserPlus aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">전자투표 회원가입</CardTitle>
          <CardDescription>
            E-Vote 인증 계정을 만들고 안전하게 투표 서비스에 접속하세요.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <TextField
              id="username"
              label="아이디"
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={64}
              pattern="[a-zA-Z0-9_.-]+"
              required
              value={draft.username}
              onChange={(event) =>
                onFieldChange('username', event.currentTarget.value)
              }
              hint="영문, 숫자, _, ., -를 사용해 3~64자로 입력하세요."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id="password"
                label="비밀번호"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={draft.password}
                onChange={(event) =>
                  onFieldChange('password', event.currentTarget.value)
                }
                hint="8자 이상 입력하세요."
              />
              <TextField
                id="confirm-password"
                label="비밀번호 확인"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                value={draft.confirmPassword}
                onChange={(event) =>
                  onFieldChange('confirmPassword', event.currentTarget.value)
                }
              />
            </div>

            <TextField
              id="name"
              label="이름"
              name="name"
              autoComplete="name"
              maxLength={64}
              required
              value={draft.name}
              onChange={(event) =>
                onFieldChange('name', event.currentTarget.value)
              }
            />

            <TextField
              id="email"
              label="이메일"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              placeholder="name@example.com"
              value={draft.email}
              onChange={(event) =>
                onFieldChange('email', event.currentTarget.value)
              }
            />

            <TextField
              id="phone"
              label="휴대전화 번호"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              pattern="\+?[0-9]{7,15}"
              required
              placeholder="+821012345678"
              value={draft.phone}
              onChange={(event) =>
                onFieldChange('phone', event.currentTarget.value)
              }
              hint="국가번호를 포함한 숫자 7~15자리 형식으로 입력하세요."
            />

            {error ? (
              <p
                className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck aria-hidden="true" />
              )}
              {isPending ? '계정을 만들고 있습니다' : '안전하게 회원가입'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t text-sm text-muted-foreground">
          이미 계정이 있나요?
          <Button asChild variant="link" className="h-auto px-2 py-0">
            <Link href={loginHref}>로그인</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
