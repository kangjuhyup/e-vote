import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import type {
  OrganizationApplicationPage,
  OrganizationApplicationStatus,
} from '../model/organization.types';

interface OrganizationApplicationAdminListProps {
  errorMessage?: string;
  isMutating: boolean;
  onApprove: (id: string) => void;
  onPageChange: (page: number) => void;
  onReject: (id: string, reason: string) => void;
  onRetryProvisioning: (id: string) => void;
  onStatusChange: (status?: OrganizationApplicationStatus) => void;
  page: OrganizationApplicationPage;
  rejectionReasons: Record<string, string>;
  selectedStatus?: OrganizationApplicationStatus;
  setRejectionReason: (id: string, reason: string) => void;
}

export function OrganizationApplicationAdminList(
  props: OrganizationApplicationAdminListProps,
) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>조직 생성 신청</CardTitle>
        <CardDescription>
          승인하면 조직이 생성되고 신청자에게 투표 관리 권한이 부여됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="max-w-xs space-y-2">
          <label htmlFor="application-status" className="text-sm font-medium">
            처리 상태
          </label>
          <Select
            id="application-status"
            value={props.selectedStatus ?? 'ALL'}
            onChange={(event) =>
              props.onStatusChange(
                event.target.value === 'ALL'
                  ? undefined
                  : (event.target.value as OrganizationApplicationStatus),
              )
            }
          >
            <option value="ALL">전체</option>
            <option value="PENDING">검토 대기</option>
            <option value="PROVISIONING">조직 설정 중</option>
            <option value="APPROVED">승인 완료</option>
            <option value="REJECTED">반려</option>
            <option value="PROVISIONING_FAILED">조직 설정 지연</option>
          </Select>
        </div>
        {props.errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {props.errorMessage}
          </p>
        ) : null}
        {props.page.items.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            조건에 맞는 신청이 없습니다.
          </p>
        ) : (
          <ul className="space-y-4">
            {props.page.items.map((application) => (
              <li key={application.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">
                      {application.organizationName}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      담당자 {application.contactName}
                    </p>
                  </div>
                  <Badge variant="secondary">{application.status}</Badge>
                </div>
                {application.status === 'PENDING' ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-2">
                      <label
                        htmlFor={`rejection-${application.id}`}
                        className="text-sm font-medium"
                      >
                        반려 사유
                      </label>
                      <Textarea
                        id={`rejection-${application.id}`}
                        value={props.rejectionReasons[application.id] ?? ''}
                        onChange={(event) =>
                          props.setRejectionReason(
                            application.id,
                            event.target.value,
                          )
                        }
                        placeholder="반려할 때만 입력하세요."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          props.isMutating ||
                          !(props.rejectionReasons[application.id] ?? '').trim()
                        }
                        onClick={() =>
                          props.onReject(
                            application.id,
                            props.rejectionReasons[application.id] ?? '',
                          )
                        }
                      >
                        반려
                      </Button>
                      <Button
                        type="button"
                        disabled={props.isMutating}
                        onClick={() => props.onApprove(application.id)}
                      >
                        승인
                      </Button>
                    </div>
                  </div>
                ) : null}
                {application.status === 'PROVISIONING_FAILED' ? (
                  <div className="mt-4">
                    <Button
                      type="button"
                      disabled={props.isMutating}
                      onClick={() => props.onRetryProvisioning(application.id)}
                    >
                      조직 설정 다시 시도
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            disabled={props.page.page <= 1}
            onClick={() => props.onPageChange(props.page.page - 1)}
          >
            이전
          </Button>
          <p className="text-sm tabular-nums text-muted-foreground">
            {props.page.page} / {Math.max(1, props.page.totalPages)} 페이지
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={
              props.page.totalPages === 0 ||
              props.page.page >= props.page.totalPages
            }
            onClick={() => props.onPageChange(props.page.page + 1)}
          >
            다음
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
