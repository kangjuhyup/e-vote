import { redirect } from 'next/navigation';

import { SignUpContainer } from '@/features/auth/container/sign-up-container';
import { auth } from '@/shared/auth/auth';

export const dynamic = 'force-dynamic';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invitation?: string }>;
}) {
  const session = await auth();
  const { invitation } = await searchParams;

  if (session?.user) {
    redirect('/');
  }

  return <SignUpContainer invitationToken={invitation} />;
}
