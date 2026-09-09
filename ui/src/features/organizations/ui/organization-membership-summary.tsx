import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { OrganizationMembership } from '../model/organization.types';

export function OrganizationMembershipSummary({
  membership,
}: {
  membership: OrganizationMembership;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{membership.name}</CardTitle>
          <Badge variant="secondary">
            {membership.canManage ? '투표 관리자' : '구성원'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          조직관리번호 {membership.code}
        </p>
      </CardContent>
    </Card>
  );
}
