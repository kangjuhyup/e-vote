import { SignInContainer } from '@/features/auth/container/sign-in-container';
import { OrganizationInvitationAcceptanceContainer } from '@/features/organizations/container/organization-invitation-acceptance-container';
import { getAppSession } from '@/shared/auth/app-session';

export const dynamic = 'force-dynamic';

export default async function OrganizationInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const path = `/organization/invitations/${encodeURIComponent(token)}`;
  const session = await getAppSession();
  if (!session?.user)
    return (
      <SignInContainer
        redirectTo={path}
        signupHref={`/signup?invitation=${encodeURIComponent(token)}`}
        description="로그인하거나 새 계정을 만든 뒤 조직 초대를 수락할 수 있습니다."
      />
    );
  return <OrganizationInvitationAcceptanceContainer token={token} />;
}
