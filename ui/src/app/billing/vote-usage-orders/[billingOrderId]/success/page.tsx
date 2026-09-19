import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { TossTestResultContainer } from '@/features/billing/container/toss-test-result-container';
import { getAppSession } from '@/shared/auth/app-session';

export const dynamic = 'force-dynamic';

export default async function TossTestSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ billingOrderId: string }>;
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
  }>;
}) {
  if (!(await getAppSession())?.user) return <SignInContainer />;
  const { billingOrderId } = await params;
  const { paymentKey, orderId, amount } = await searchParams;
  return (
    <TossTestResultContainer
      billingOrderId={billingOrderId}
      paymentKey={paymentKey}
      orderId={orderId}
      amount={amount}
    />
  );
}
