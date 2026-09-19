import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { AdminOperationsReadRepositoryPort } from '../../../application/port/persistence/admin-operations-read-repository.port';
import type {
  AdminBillingOrderPageView,
  AdminBillingOrderView,
  AdminOperationsView,
  AdminOrganizationVoteView,
} from '../../../application/query/admin-operations.view';

type OrganizationRow = { id: string; name: string };
type CountRow = {
  organization_group_id: string | null;
  status: string;
  count: string;
};
type TotalRow = { count: string };
type VoteRow = {
  id: string;
  title: string;
  organization_group_id: string | null;
  status: string;
  updated_at: Date;
};
type OrderRow = {
  id: string;
  vote_id: string;
  vote_title: string;
  organization_group_id: string | null;
  amount: number | string;
  currency: string;
  status: string;
  issued_at: Date;
  updated_at: Date;
  paid_at: Date | null;
  canceled_at: Date | null;
  refund_requested_at: Date | null;
  refunded_at: Date | null;
  cancellation_reason: string | null;
  failure_code: string | null;
  failure_message: string | null;
  failure_reported_at: Date | null;
};

@Injectable()
export class AdminOperationsReadRepositoryAdapter implements AdminOperationsReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async getOrdersPage(input: {
    tenantId: string;
    page: number;
    pageSize: number;
    organizationId?: string;
    status?: string;
  }): Promise<AdminBillingOrderPageView> {
    const conditions = ['v.tenant_id = ?'];
    const params: Array<string | number> = [input.tenantId];
    if (input.organizationId === '__unassigned__') {
      conditions.push('v.organization_group_id is null');
    } else if (input.organizationId) {
      conditions.push('v.organization_group_id = ?');
      params.push(input.organizationId);
    }
    if (input.status) {
      conditions.push('b.status = ?');
      params.push(input.status);
    }
    const where = conditions.join(' and ');
    const db = this.em.getConnection();
    const [total, rows] = await Promise.all([
      db.execute<TotalRow[]>(
        `select count(*)::text as count from billing_orders b
         join votes v on v.id = b.vote_id where ${where}`,
        params,
      ),
      db.execute<OrderRow[]>(
        `select b.id, b.vote_id, v.title as vote_title,
           v.organization_group_id, b.amount, b.currency, b.status,
           b.issued_at, b.updated_at, b.paid_at, b.canceled_at,
           b.refund_requested_at, b.refunded_at, b.cancellation_reason,
           f.failure_code, f.failure_message, f.reported_at as failure_reported_at
         from billing_orders b join votes v on v.id = b.vote_id
         left join billing_payment_failures f on f.billing_order_id = b.id
         where ${where}
         order by b.issued_at desc, b.id desc limit ? offset ?`,
        [...params, input.pageSize, (input.page - 1) * input.pageSize],
      ),
    ]);
    const totalItems = Number(total[0]?.count ?? 0);
    return {
      items: rows.map((order) => this.toOrderView(order)),
      page: input.page,
      pageSize: input.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / input.pageSize),
    };
  }

  async getOverview(tenantId: string): Promise<AdminOperationsView> {
    const db = this.em.getConnection();
    const [organizations, counts, voteTotal, orderTotal, votes, orders] =
      await Promise.all([
        db.execute<OrganizationRow[]>(
          `select distinct on (auth_organization_group_id)
           auth_organization_group_id as id, organization_name as name
         from organization_applications
         where tenant_id = ? and status = 'APPROVED'
           and auth_organization_group_id is not null
         order by auth_organization_group_id, reviewed_at desc`,
          [tenantId],
        ),
        db.execute<CountRow[]>(
          `select organization_group_id, status, count(*)::text as count
         from votes where tenant_id = ?
         group by organization_group_id, status`,
          [tenantId],
        ),
        db.execute<TotalRow[]>(
          `select count(*)::text as count from votes where tenant_id = ?`,
          [tenantId],
        ),
        db.execute<TotalRow[]>(
          `select count(*)::text as count from billing_orders b
         join votes v on v.id = b.vote_id where v.tenant_id = ?`,
          [tenantId],
        ),
        db.execute<VoteRow[]>(
          `select id, title, organization_group_id, status, updated_at
         from votes where tenant_id = ?
         order by updated_at desc, id desc limit 50`,
          [tenantId],
        ),
        db.execute<OrderRow[]>(
          `select b.id, b.vote_id, v.title as vote_title,
           v.organization_group_id, b.amount, b.currency, b.status,
           b.issued_at, b.updated_at, b.paid_at, b.canceled_at,
           b.refund_requested_at, b.refunded_at, b.cancellation_reason,
           f.failure_code, f.failure_message, f.reported_at as failure_reported_at
         from billing_orders b join votes v on v.id = b.vote_id
         left join billing_payment_failures f on f.billing_order_id = b.id
         where v.tenant_id = ?
         order by b.issued_at desc, b.id desc limit 50`,
          [tenantId],
        ),
      ]);

    const byOrganization = new Map<string, AdminOrganizationVoteView>(
      organizations.map(({ id, name }) => [
        id,
        { id, name, totalVotes: 0, voteCounts: {} },
      ]),
    );
    for (const row of counts) {
      const id = row.organization_group_id ?? '__unassigned__';
      const item = byOrganization.get(id) ?? {
        id,
        name: row.organization_group_id ? '이름 확인 필요' : '소속 미지정',
        totalVotes: 0,
        voteCounts: {},
      };
      const count = Number(row.count);
      item.voteCounts[row.status] = count;
      item.totalVotes += count;
      byOrganization.set(id, item);
    }

    return {
      organizations: [...byOrganization.values()].sort(
        (a, b) => b.totalVotes - a.totalVotes || a.name.localeCompare(b.name),
      ),
      recentVotes: votes.map((vote) => ({
        id: vote.id,
        title: vote.title,
        organizationGroupId: vote.organization_group_id ?? undefined,
        status: vote.status,
        updatedAt: vote.updated_at,
      })),
      recentOrders: orders.map((order) => this.toOrderView(order)),
      totalVotes: Number(voteTotal[0]?.count ?? 0),
      totalOrders: Number(orderTotal[0]?.count ?? 0),
    };
  }

  private toOrderView(order: OrderRow): AdminBillingOrderView {
    return {
      id: order.id,
      voteId: order.vote_id,
      voteTitle: order.vote_title,
      organizationGroupId: order.organization_group_id ?? undefined,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
      issuedAt: order.issued_at,
      statusChangedAt:
        (order.status === 'PAID'
          ? order.paid_at
          : order.status === 'CANCELED'
            ? order.canceled_at
            : order.status === 'REFUND_PENDING'
              ? order.refund_requested_at
              : order.status === 'REFUNDED'
                ? order.refunded_at
                : order.issued_at) ?? order.updated_at,
      paidAt: order.paid_at ?? undefined,
      canceledAt: order.canceled_at ?? undefined,
      refundRequestedAt: order.refund_requested_at ?? undefined,
      refundedAt: order.refunded_at ?? undefined,
      cancellationReason: order.cancellation_reason ?? undefined,
      failureReason: order.failure_code ?? undefined,
      failureMessage: order.failure_message ?? undefined,
      failedAt: order.failure_reported_at ?? undefined,
    };
  }
}
