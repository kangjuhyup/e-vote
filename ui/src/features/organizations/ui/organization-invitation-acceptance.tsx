import { Building2, CircleCheckBig } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { OrganizationInvitation } from '../model/organization.types';

export function OrganizationInvitationAcceptance({
  invitation,
  isAccepting,
  accepted,
  error,
  onAccept,
  onConfirm,
}: {
  invitation: OrganizationInvitation;
  isAccepting: boolean;
  accepted: boolean;
  error?: string;
  onAccept: () => void;
  onConfirm: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-accent">
            <Building2 aria-hidden="true" />
          </div>
          <CardTitle>{invitation.organizationName} 초대</CardTitle>
          <CardDescription>
            {invitation.contactHint} 계정으로 초대되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-4 text-sm">
            <p>
              참여 권한:{' '}
              {invitation.role === 'MANAGER' ? '투표 관리자' : '구성원'}
            </p>
            <p className="mt-1 text-muted-foreground">
              초대 유효기간:{' '}
              {new Date(invitation.expiresAt).toLocaleString('ko-KR')}
            </p>
          </div>
          {accepted || invitation.status === 'ACCEPTED' ? (
            <div className="space-y-4">
              <p role="status">
                <CircleCheckBig
                  className="mr-2 inline size-5 text-emerald-600"
                  aria-hidden="true"
                />
                조직 참여가 완료되었습니다. 새 권한을 적용하려면 다시 로그인해
                주세요.
              </p>
              <Button className="w-full" onClick={onConfirm}>
                확인
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              disabled={isAccepting || invitation.status !== 'PENDING'}
              onClick={onAccept}
            >
              {isAccepting ? '참여하는 중…' : '초대 수락'}
            </Button>
          )}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
