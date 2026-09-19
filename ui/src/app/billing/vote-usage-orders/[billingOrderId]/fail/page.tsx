import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { TossTestResultContainer } from '@/features/billing/container/toss-test-result-container';
import { getAppSession } from '@/shared/auth/app-session';

export const dynamic = 'force-dynamic';

export default async function TossTestFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ billingOrderId: string }>;
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  if (!(await getAppSession())?.user) return <SignInContainer />;
  const { billingOrderId } = await params;
  const { code, message } = await searchParams;
  return (
    <TossTestResultContainer
      billingOrderId={billingOrderId}
      failureCode={code ?? 'PAYMENT_FAILED'}
      failureMessage={message}
    />
  );
}
