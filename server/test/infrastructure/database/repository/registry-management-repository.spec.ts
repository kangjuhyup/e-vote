import { ElectionCommissionRepositoryAdapter } from '../../../../src/modules/election-commission/infrastructure/database/repository/command/election-commission-repository.adapter';
import { ElectionCommissionMemberRepositoryAdapter } from '../../../../src/modules/election-commission/infrastructure/database/repository/command/election-commission-member-repository.adapter';
import { ElectionCommissionMembershipAccessAdapter } from '../../../../src/modules/election-commission/infrastructure/database/repository/query/election-commission-membership-access.adapter';
import { ElectoralRollRepositoryAdapter } from '../../../../src/modules/electoral-roll/infrastructure/database/repository/command/electoral-roll-repository.adapter';
import { ElectionCommissionReadRepositoryAdapter } from '../../../../src/modules/election-commission/infrastructure/database/repository/query/election-commission-read-repository.adapter';

describe('deleted registries preserve history and cannot grant access', () => {
  const deletedAt = new Date('2026-09-06T00:00:00Z');
  it('marks a roll deleted without deleting its members or snapshots', async () => {
    const em = { nativeUpdate: jest.fn(), nativeDelete: jest.fn() };
    await new ElectoralRollRepositoryAdapter(em as any).softDelete(
      'roll-1',
      deletedAt,
    );
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'roll-1' },
      { deletedAt },
    );
    expect(em.nativeDelete).not.toHaveBeenCalled();
  });
  it('marks a commission deleted and suspended without deleting its history', async () => {
    const em = { nativeUpdate: jest.fn(), nativeDelete: jest.fn() };
    await new ElectionCommissionRepositoryAdapter(em as any).softDelete(
      'commission-1',
      deletedAt,
    );
    expect(em.nativeUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'commission-1' },
      { deletedAt, status: 'SUSPENDED', updatedAt: deletedAt },
    );
    expect(em.nativeDelete).not.toHaveBeenCalled();
  });
  it('excludes deleted commissions from write-side lookup', async () => {
    const em = { findOne: jest.fn().mockResolvedValue(null) };
    await new ElectionCommissionRepositoryAdapter(em as any).findById(
      'commission-1',
    );
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), {
      id: 'commission-1',
      deletedAt: null,
    });
  });
  it('requires an active membership in a nondeleted active commission', async () => {
    const em = { findOne: jest.fn().mockResolvedValue(null) };
    expect(
      await new ElectionCommissionMembershipAccessAdapter(
        em as any,
      ).isActiveMember('commission-1', 'user-1'),
    ).toBe(false);
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), {
      commission: { id: 'commission-1', deletedAt: null, status: 'ACTIVE' },
      userPrincipalId: 'user-1',
      status: 'ACTIVE',
    });
  });
  it('loads only active administrators of the requested nondeleted commission', async () => {
    const em = { find: jest.fn().mockResolvedValue([]) };
    await new ElectionCommissionMemberRepositoryAdapter(
      em as any,
    ).findActiveAdmins('commission-1');
    expect(em.find).toHaveBeenCalledWith(
      expect.anything(),
      {
        commission: { id: 'commission-1', deletedAt: null },
        status: 'ACTIVE',
        role: 'ADMIN',
      },
      expect.anything(),
    );
  });
  it('hides removed committee members from detail responses', async () => {
    const em = {
      findOne: jest.fn().mockResolvedValue({
        id: 'commission-1',
        name: 'Commission',
        status: 'ACTIVE',
        createdAt: deletedAt,
        updatedAt: deletedAt,
        members: [{ id: 'inactive', status: 'INACTIVE' }],
      }),
    };
    const result = await new ElectionCommissionReadRepositoryAdapter(
      em as any,
    ).findDetailById('commission-1');
    expect(result?.members).toEqual([]);
  });
});
