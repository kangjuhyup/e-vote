import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "@/shared/auth/auth";
import { E_VOTE_PROVIDER_ID } from "@/shared/auth/oidc";

export function SignInContainer() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,var(--accent),transparent_42%)] px-4 py-10">
      <Card className="w-full max-w-md rounded-xl shadow-lg">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck aria-hidden="true" />
          </div>
          <CardTitle asChild>
            <h1 className="text-2xl">전자투표 로그인</h1>
          </CardTitle>
          <CardDescription>
            E-Vote 인증 서버 계정으로 운영 대시보드에 접속합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";

              await signIn(E_VOTE_PROVIDER_ID);
            }}
          >
            <Button type="submit" className="w-full">
              <ShieldCheck aria-hidden="true" />
              OIDC 로그인
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
