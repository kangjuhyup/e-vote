import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { OrganizationApplication } from '../model/organization.types';

const statusLabels = {
  PENDING: '검토 대기',
  PROVISIONING: '조직 설정 중',
  APPROVED: '승인 완료',
  REJECTED: '신청 반려',
  PROVISIONING_FAILED: '조직 설정 지연',
} as const;

interface OrganizationApplicationStatusProps {
  application: OrganizationApplication;
  onReapply?: () => void;
  onReauthenticate?: () => void;
}

export function OrganizationApplicationStatus({
  application,
  onReapply,
  onReauthenticate,
}: OrganizationApplicationStatusProps) {
  return (
    <Card className="max-w-2xl" aria-live="polite">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{application.organizationName}</CardTitle>
          <Badge variant="secondary">{statusLabels[application.status]}</Badge>
        </div>
        <CardDescription>조직 생성 신청 상태</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          조직관리번호 {application.organizationManagementNumber}
        </p>
        {application.status === 'PENDING' ? (
          <p>운영자가 신청 정보를 검토하고 있습니다.</p>
        ) : null}
        {application.status === 'PROVISIONING' ? (
          <p>승인이 완료되어 조직과 관리자 권한을 설정하고 있습니다.</p>
        ) : null}
        {application.status === 'PROVISIONING_FAILED' ? (
          <p>
            조직 설정이 지연되고 있습니다. 운영자가 안전하게 다시 처리할 수
            있으므로 새 신청을 만들 필요가 없습니다.
          </p>
        ) : null}
        {application.status === 'REJECTED' ? (
          <>
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="font-medium">반려 사유</p>
              <p className="mt-1 text-muted-foreground">
                {application.rejectionReason ?? '신청 정보를 확인해 주세요.'}
              </p>
            </div>
            {onReapply ? (
              <Button type="button" onClick={onReapply}>
                다시 신청
              </Button>
            ) : null}
          </>
        ) : null}
        {application.status === 'APPROVED' ? (
          <div className="space-y-3">
            <p>조직 설정이 완료되었습니다.</p>
            <p className="text-muted-foreground">
              새 조직 권한은 새 로그인부터 적용됩니다. 안전한 권한 갱신을 위해
              다시 로그인해 주세요.
            </p>
            {onReauthenticate ? (
              <Button type="button" onClick={onReauthenticate}>
                다시 로그인
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
