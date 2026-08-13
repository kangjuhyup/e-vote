import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { E_VOTE_PROVIDER_ID } from "@/shared/auth/oidc";
import { signIn } from "@/shared/auth/auth";

export function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-lg">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">전자투표 로그인</CardTitle>
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
