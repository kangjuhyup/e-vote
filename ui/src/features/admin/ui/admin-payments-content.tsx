import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { AdminBillingOrderPage, OrganizationVoteOverview } from '../model/admin-operations.types';

const statusLabels: Record<string, string> = {
  PENDING_PAYMENT: '결제 대기', PAID: '결제 완료', CANCELED: '취소',
  REFUND_PENDING: '환불 처리 중', REFUNDED: '환불 완료',
};

function time(value: string | null) {
  return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
}

export function AdminPaymentsContent({
  page, organizations, organizationId, status, onOrganizationChange, onStatusChange, onPageChange,
}: {
  page: AdminBillingOrderPage;
  organizations: OrganizationVoteOverview[];
  organizationId: string;
  status: string;
  onOrganizationChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPageChange: (value: number) => void;
}) {
  const names = new Map(organizations.map((item) => [item.id, item.name]));
  return <Card>
    <CardHeader><CardTitle>투표 사용료 결제 주문</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><label htmlFor="payment-organization" className="text-sm font-medium">조직</label>
          <Select id="payment-organization" value={organizationId} onChange={(event) => onOrganizationChange(event.target.value)}>
            <option value="all">모든 조직</option>
            {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </Select>
        </div>
        <div className="space-y-2"><label htmlFor="payment-status" className="text-sm font-medium">결제 상태</label>
          <Select id="payment-status" value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="all">모든 상태</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">조건에 맞는 주문 {page.totalItems.toLocaleString('ko-KR')}건</p>
      {page.items.length === 0 ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">조건에 맞는 결제 주문이 없습니다.</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
          <thead><tr className="border-b text-muted-foreground"><th scope="col" className="p-3">투표 · 조직</th><th scope="col" className="p-3">금액</th><th scope="col" className="p-3">상태</th><th scope="col" className="p-3">주문 생성</th><th scope="col" className="p-3">상태 변경</th><th scope="col" className="p-3">실패·취소 사유</th></tr></thead>
          <tbody>{page.items.map((item) => <tr key={item.id} className="border-b align-top last:border-0">
            <td className="p-3"><div className="font-medium">{item.voteTitle}</div><div className="text-muted-foreground">{names.get(item.organizationGroupId ?? '__unassigned__') ?? '이름 확인 필요'}</div><div className="font-mono text-xs text-muted-foreground">{item.id}</div><details className="mt-2 text-xs"><summary className="cursor-pointer font-medium">처리 시각 자세히</summary><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-muted-foreground"><dt>결제 완료</dt><dd>{time(item.paidAt)}</dd><dt>취소</dt><dd>{time(item.canceledAt)}</dd><dt>환불 요청</dt><dd>{time(item.refundRequestedAt)}</dd><dt>환불 완료</dt><dd>{time(item.refundedAt)}</dd></dl></details></td>
            <td className="p-3 tabular-nums">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: item.currency, maximumFractionDigits: 0 }).format(item.amount)}</td>
            <td className="p-3"><Badge variant="secondary">{statusLabels[item.status] ?? item.status}</Badge></td>
            <td className="p-3 tabular-nums">{time(item.issuedAt)}</td>
            <td className="p-3 tabular-nums">{time(item.statusChangedAt)}</td>
            <td className="p-3">{item.failureReason ? <><div>{item.failureMessage ?? `실패 코드: ${item.failureReason}`}</div><div className="text-xs text-muted-foreground">{item.failureReason} · {time(item.failedAt)}</div></> : null}{item.cancellationReason ? <div className="mt-1">취소 사유: {item.cancellationReason}</div> : null}{!item.failureReason && !item.cancellationReason ? '기록 없음' : null}</td>
          </tr>)}</tbody>
        </table></div>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" disabled={page.page <= 1} onClick={() => onPageChange(page.page - 1)}>이전</Button>
        <span className="text-sm tabular-nums text-muted-foreground">{page.page} / {Math.max(1, page.totalPages)} 페이지</span>
        <Button type="button" variant="outline" disabled={page.page >= page.totalPages} onClick={() => onPageChange(page.page + 1)}>다음</Button>
      </div>
      <p className="text-xs text-muted-foreground">실패 코드는 결제 화면에서 반환된 내용이며 결제 상태와 별도로 기록됩니다.</p>
    </CardContent>
  </Card>;
}
