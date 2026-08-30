import { redirect } from "next/navigation";

import { SignUpContainer } from "@/features/auth/container/sign-up-container";
import { auth } from "@/shared/auth/auth";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return <SignUpContainer />;
}
