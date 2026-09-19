import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { AdminOperationsOverview } from '../model/admin-operations.types';

const voteStatusLabels: Record<string, string> = {
  DRAFT: '작성 중', FINALIZED: '확정', OPEN: '진행 중', CLOSED: '종료', CANCELED: '취소',
};
const orderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: '결제 대기', PAID: '결제 완료', CANCELED: '취소',
  REFUND_PENDING: '환불 처리 중', REFUNDED: '환불 완료',
};

function formatTime(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
}

export function AdminOperationsContent({
  overview, organizationId, onOrganizationChange,
}: {
  overview: AdminOperationsOverview;
  organizationId: string;
  onOrganizationChange: (value: string) => void;
}) {
  const organizationNames = new Map(overview.organizations.map((item) => [item.id, item.name]));
  const matchesOrganization = (id: string | null) => organizationId === 'all' || (id ?? '__unassigned__') === organizationId;
  const votes = overview.recentVotes.filter((item) => matchesOrganization(item.organizationGroupId));
  const orders = overview.recentOrders.filter((item) => matchesOrganization(item.organizationGroupId));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="등록 조직" value={overview.organizations.length} />
        <Metric label="전체 투표" value={overview.totalVotes} />
        <Metric label="전체 결제 주문" value={overview.totalOrders} />
      </div>
      <div className="max-w-xs space-y-2">
        <label htmlFor="admin-organization" className="text-sm font-medium">조직 선택</label>
        <Select id="admin-organization" value={organizationId} onChange={(event) => onOrganizationChange(event.target.value)}>
          <option value="all">모든 조직</option>
          {overview.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
        </Select>
      </div>
      <Card>
        <CardHeader><CardTitle>조직별 투표 상태</CardTitle></CardHeader>
        <CardContent>
          {overview.organizations.length === 0 ? <Empty>등록된 조직이나 투표가 없습니다.</Empty> : (
            <div className="grid gap-3 md:grid-cols-2">
              {overview.organizations.filter((item) => organizationId === 'all' || item.id === organizationId).map((item) => (
                <div key={item.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{item.name}</h3><span className="text-sm text-muted-foreground">총 {item.totalVotes}건</span></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(item.voteCounts).map(([status, count]) => <Badge key={status} variant="secondary">{voteStatusLabels[status] ?? status} {count}</Badge>)}
                    {item.totalVotes === 0 ? <span className="text-sm text-muted-foreground">투표 없음</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>최근 투표</CardTitle></CardHeader>
        <CardContent>
          {votes.length === 0 ? <Empty>조건에 맞는 투표가 없습니다.</Empty> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
              <thead><tr className="border-b text-muted-foreground"><th scope="col" className="p-3">투표</th><th scope="col" className="p-3">조직</th><th scope="col" className="p-3">상태</th><th scope="col" className="p-3">변경 시각</th></tr></thead>
              <tbody>{votes.map((vote) => <tr key={vote.id} className="border-b last:border-0"><td className="p-3 font-medium">{vote.title}</td><td className="p-3">{organizationNames.get(vote.organizationGroupId ?? '__unassigned__') ?? '이름 확인 필요'}</td><td className="p-3"><Badge variant="secondary">{voteStatusLabels[vote.status] ?? vote.status}</Badge></td><td className="p-3 tabular-nums">{formatTime(vote.updatedAt)}</td></tr>)}</tbody>
            </table></div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">최근 변경된 투표 50건을 표시합니다.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>최근 결제 주문</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? <Empty>조건에 맞는 결제 주문이 없습니다.</Empty> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
              <thead><tr className="border-b text-muted-foreground"><th scope="col" className="p-3">투표 · 조직</th><th scope="col" className="p-3">금액</th><th scope="col" className="p-3">결제 상태</th><th scope="col" className="p-3">상태 변경</th><th scope="col" className="p-3">실패·취소 사유</th></tr></thead>
              <tbody>{orders.map((order) => <tr key={order.id} className="border-b align-top last:border-0">
                <td className="p-3"><div className="font-medium">{order.voteTitle}</div><div className="text-muted-foreground">{organizationNames.get(order.organizationGroupId ?? '__unassigned__') ?? '이름 확인 필요'}</div><div className="font-mono text-xs text-muted-foreground">{order.id}</div></td>
                <td className="p-3 tabular-nums">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: order.currency, maximumFractionDigits: 0 }).format(order.amount)}</td>
                <td className="p-3"><Badge variant="secondary">{orderStatusLabels[order.status] ?? order.status}</Badge></td>
                <td className="p-3 tabular-nums">{formatTime(order.statusChangedAt)}</td>
                <td className="p-3">{order.failureReason ? <><span>{order.failureMessage ?? `실패 코드: ${order.failureReason}`}</span><span className="block text-xs text-muted-foreground">{order.failureReason} · {formatTime(order.failedAt)}</span></> : order.cancellationReason ?? '기록 없음'}</td>
              </tr>)}</tbody>
            </table></div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">최근 생성된 주문 50건을 표시합니다. 실패 코드는 결제 화면에서 반환된 내용이며 주문 상태와 별도로 기록됩니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString('ko-KR')}</p></CardContent></Card>;
}

function Empty({ children }: { children: string }) {
  return <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</p>;
}
