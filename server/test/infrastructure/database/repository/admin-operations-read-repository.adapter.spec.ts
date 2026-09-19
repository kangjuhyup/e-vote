import { AdminOperationsReadRepositoryAdapter } from '../../../../src/modules/organization/infrastructure/database/repository/admin-operations-read-repository.adapter';

describe('admin operations overview', () => {
  it('scopes every query to the tenant and reports the actual status transition time', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'org-a', name: '조직 A' }])
      .mockResolvedValueOnce([
        { organization_group_id: 'org-a', status: 'OPEN', count: '2' },
      ])
      .mockResolvedValueOnce([{ count: '2' }])
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'order-a',
          vote_id: 'vote-a',
          vote_title: '투표 A',
          organization_group_id: 'org-a',
          amount: '3000',
          currency: 'KRW',
          status: 'PAID',
          issued_at: new Date('2026-09-01T00:00:00Z'),
          updated_at: new Date('2026-09-03T00:00:00Z'),
          paid_at: new Date('2026-09-02T00:00:00Z'),
          canceled_at: null,
          refund_requested_at: null,
          refunded_at: null,
          cancellation_reason: null,
          failure_code: null,
          failure_message: null,
          failure_reported_at: null,
        },
      ]);
    const repository = new AdminOperationsReadRepositoryAdapter({
      getConnection: () => ({ execute }),
    } as never);

    const overview = await repository.getOverview('tenant-a');

    expect(overview.organizations).toEqual([
      {
        id: 'org-a',
        name: '조직 A',
        totalVotes: 2,
        voteCounts: { OPEN: 2 },
      },
    ]);
    expect(overview.recentOrders[0].statusChangedAt).toEqual(
      new Date('2026-09-02T00:00:00Z'),
    );
    expect(overview.recentOrders[0].failureReason).toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(6);
    for (const call of execute.mock.calls as [string, string[]][]) {
      expect(call[1]).toEqual(['tenant-a']);
    }
  });

  it('filters paged orders inside the administrator tenant', async () => {
    const execute = jest
      .fn()
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([]);
    const repository = new AdminOperationsReadRepositoryAdapter({
      getConnection: () => ({ execute }),
    } as never);

    const page = await repository.getOrdersPage({
      tenantId: 'tenant-a',
      page: 2,
      pageSize: 20,
      organizationId: 'org-a',
      status: 'PAID',
    });

    expect(page).toEqual({
      items: [],
      page: 2,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
    });
    const calls = execute.mock.calls as [string, Array<string | number>][];
    expect(calls[0][0]).toContain(
      'v.tenant_id = ? and v.organization_group_id = ? and b.status = ?',
    );
    expect(calls[0][1]).toEqual(['tenant-a', 'org-a', 'PAID']);
    expect(calls[1][1]).toEqual(['tenant-a', 'org-a', 'PAID', 20, 20]);
  });
});
