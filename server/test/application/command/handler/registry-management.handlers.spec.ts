import type { DatabaseTransactionManager } from '../../../../src/shared/application/port/persistence/transaction/database-transaction-manager.port';
import { ElectionCommissionAggregate } from '../../../../src/modules/election-commission/domain/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../../src/modules/election-commission/domain/election-commission-member.aggregate';
import { ElectionCommissionManagementAccess } from '../../../../src/modules/election-commission/application/command/election-commission-management.access';
import { DeleteElectionCommissionHandler } from '../../../../src/modules/election-commission/application/command/handler/delete-election-commission.handler';
import { RemoveElectionCommissionMemberHandler } from '../../../../src/modules/election-commission/application/command/handler/remove-election-commission-member.handler';
import { UpdateElectionCommissionMemberHandler } from '../../../../src/modules/election-commission/application/command/handler/update-election-commission-member.handler';
import { DeleteElectoralRollHandler } from '../../../../src/modules/electoral-roll/application/command/handler/delete-electoral-roll.handler';
import {
  ElectionCommissionAdminRequiredError,
  ElectionCommissionManagementNotFoundError,
  LastElectionCommissionAdminError,
} from '../../../../src/modules/election-commission/application/command/election-commission-management.error';
import { ElectoralRollNotFoundError } from '../../../../src/modules/electoral-roll/application/command/electoral-roll.error';
import { DomainError } from '../../../../src/shared/domain/domain-error';

const changedAt = new Date('2026-09-06T00:00:00Z');
const command = {
  commissionId: 'commission-1',
  memberId: 'member-1',
  userPrincipalId: 'admin-user',
  name: undefined,
  role: undefined,
  changedAt,
};
function member(
  id = 'member-1',
  role: 'ADMIN' | 'FIELD_MANAGER' = 'FIELD_MANAGER',
) {
  return ElectionCommissionMemberAggregate.create({
    id,
    commissionId: command.commissionId,
    userPrincipalId: id === 'admin' ? 'admin-user' : id,
    name: 'Original',
    role,
    registeredAt: changedAt,
  });
}
function setup() {
  const commission = ElectionCommissionAggregate.create({
    id: command.commissionId,
    name: 'Commission',
    createdAt: changedAt,
  });
  const target = member();
  const admin = member('admin', 'ADMIN');
  const commissions = {
    nextId: jest.fn(),
    findById: jest.fn().mockResolvedValue(commission),
    save: jest.fn(),
    softDelete: jest.fn(),
  };
  const members = {
    nextId: jest.fn(),
    findActiveAdmins: jest.fn().mockResolvedValue([admin]),
    findByIds: jest.fn().mockResolvedValue([target]),
    save: jest.fn(),
  };
  const access = new ElectionCommissionManagementAccess(commissions, members);
  const runInTransaction = jest.fn(async (work: () => Promise<unknown>) =>
    work(),
  );
  const tx = { runInTransaction } as unknown as DatabaseTransactionManager;
  return {
    commission,
    target,
    admin,
    commissions,
    members,
    tx,
    runInTransaction,
    remove: new RemoveElectionCommissionMemberHandler(members, access, tx),
    update: new UpdateElectionCommissionMemberHandler(members, access, tx),
    deleteCommission: new DeleteElectionCommissionHandler(
      commissions,
      access,
      tx,
    ),
  };
}
describe('committee management authorization and history preservation', () => {
  it('allows an administrator to delete the committee in a serializable transaction', async () => {
    const s = setup();
    await s.deleteCommission.execute(command);
    expect(s.commissions.softDelete).toHaveBeenCalledWith(
      command.commissionId,
      changedAt,
    );
    expect(s.runInTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'serializable',
    });
  });
  it.each(['remove', 'update', 'deleteCommission'] as const)(
    'rejects a non-administrator requesting %s without writing',
    async (action) => {
      const s = setup();
      await expect(
        s[action].execute({ ...command, userPrincipalId: 'outsider' }),
      ).rejects.toBeInstanceOf(ElectionCommissionAdminRequiredError);
      expect(s.members.save).not.toHaveBeenCalled();
      expect(s.commissions.softDelete).not.toHaveBeenCalled();
    },
  );
  it('rejects management of a deleted or nonexistent committee', async () => {
    const s = setup();
    s.commissions.findById.mockResolvedValue(undefined);
    await expect(s.deleteCommission.execute(command)).rejects.toBeInstanceOf(
      ElectionCommissionManagementNotFoundError,
    );
  });
  it('rejects management of a suspended committee', async () => {
    const s = setup();
    s.commission.suspend(changedAt);
    await expect(s.remove.execute(command)).rejects.toBeInstanceOf(
      ElectionCommissionAdminRequiredError,
    );
  });
  it('deactivates a member while preserving their identifier and user reference', async () => {
    const s = setup();
    await s.remove.execute(command);
    expect(s.target.status).toBe('INACTIVE');
    expect(s.target.id).toBe('member-1');
    expect(s.members.save).toHaveBeenCalledWith(s.target);
  });
  it('updates the member name and role without changing their user identity', async () => {
    const s = setup();
    await s.update.execute({ ...command, name: ' New name ', role: 'ADMIN' });
    expect(s.target).toMatchObject({
      name: 'New name',
      role: 'ADMIN',
      userPrincipalId: 'member-1',
    });
    expect(s.target.pullEvents().map((e) => e.type)).toContain(
      'ElectionCommissionMemberUpdated',
    );
  });
  it.each(['remove', 'update'] as const)(
    'rejects %s of a member outside the committee',
    async (action) => {
      const s = setup();
      s.members.findByIds.mockResolvedValue([]);
      await expect(s[action].execute(command)).rejects.toBeInstanceOf(
        ElectionCommissionManagementNotFoundError,
      );
      expect(s.members.findByIds).toHaveBeenCalledWith(command.commissionId, [
        command.memberId,
      ]);
      expect(s.members.save).not.toHaveBeenCalled();
    },
  );
  it.each(['remove', 'update'] as const)(
    'preserves the final active administrator during %s',
    async (action) => {
      const s = setup();
      s.members.findByIds.mockResolvedValue([s.admin]);
      await expect(
        s[action].execute({
          ...command,
          memberId: 'admin',
          role: 'FIELD_MANAGER',
        }),
      ).rejects.toBeInstanceOf(LastElectionCommissionAdminError);
      expect(s.members.save).not.toHaveBeenCalled();
    },
  );
  it('allows the final administrator to change their name', async () => {
    const s = setup();
    s.members.findByIds.mockResolvedValue([s.admin]);
    await s.update.execute({ ...command, memberId: 'admin', name: 'Renamed' });
    expect(s.admin.name).toBe('Renamed');
  });
  it('allows removal of an administrator when another administrator remains', async () => {
    const s = setup();
    s.members.findByIds.mockResolvedValue([s.admin]);
    s.members.findActiveAdmins.mockResolvedValue([
      s.admin,
      member('other', 'ADMIN'),
    ]);
    await s.remove.execute({ ...command, memberId: 'admin' });
    expect(s.admin.status).toBe('INACTIVE');
  });
  it('rejects changes to an inactive member', async () => {
    const s = setup();
    s.target.deactivate(changedAt);
    await expect(
      s.update.execute({ ...command, name: 'Renamed' }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
describe('electoral roll deletion access', () => {
  it('soft deletes only a roll accessible to the authenticated user', async () => {
    const s = setup();
    const repository = {
      findById: jest.fn().mockResolvedValue({ id: 'roll-1' }),
      softDelete: jest.fn(),
    };
    await new DeleteElectoralRollHandler(repository as any, s.tx).execute({
      electoralRollId: 'roll-1',
      userPrincipalId: 'owner',
      changedAt,
    });
    expect(repository.findById).toHaveBeenCalledWith('roll-1', 'owner');
    expect(repository.softDelete).toHaveBeenCalledWith('roll-1', changedAt);
  });
  it('does not delete an inaccessible or already deleted roll', async () => {
    const s = setup();
    const repository = {
      findById: jest.fn().mockResolvedValue(undefined),
      softDelete: jest.fn(),
    };
    await expect(
      new DeleteElectoralRollHandler(repository as any, s.tx).execute({
        electoralRollId: 'roll-1',
        userPrincipalId: 'outsider',
        changedAt,
      }),
    ).rejects.toBeInstanceOf(ElectoralRollNotFoundError);
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
