import Link from "next/link";
import { CircleCheckBig, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SignUpSuccessProps {
  username: string;
}

export function SignUpSuccess({ username }: SignUpSuccessProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-xl text-center shadow-lg shadow-primary/5">
        <CardHeader className="justify-items-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CircleCheckBig aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">회원가입이 완료되었습니다</CardTitle>
          <CardDescription>
            <strong className="font-medium text-foreground">{username}</strong>
            님의 E-Vote 인증 계정이 생성되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">
              <LogIn aria-hidden="true" />
              로그인하러 가기
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
