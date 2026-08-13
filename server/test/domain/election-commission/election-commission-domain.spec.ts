import { ElectionCommissionAggregate } from '../../../src/domain/election-commission/election-commission.aggregate';
import { ElectionCommissionMemberAggregate } from '../../../src/domain/election-commission/election-commission-member.aggregate';
import {
  ElectionCommissionCreated,
  ElectionCommissionMemberRegistered,
} from '../../../src/domain/election-commission/election-commission.events';
import { ElectionCommissionMemberRole } from '../../../src/domain/election-commission/type/election-commission-member-role.type';
import { ElectionCommissionMemberStatus } from '../../../src/domain/election-commission/type/election-commission-member-status.type';
import { ElectionCommissionStatus } from '../../../src/domain/election-commission/type/election-commission-status.type';
import { DomainError } from '../../../src/domain/shared/domain-error';
import { VotingChannel } from '../../../src/domain/vote/type/voting-channel.type';

describe('election commission domain', () => {
  it('creates an active election commission and emits an event', () => {
    const commission = ElectionCommissionAggregate.create({
      id: 'commission-1',
      name: 'Main Election Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(commission).toMatchObject({
      id: 'commission-1',
      name: 'Main Election Commission',
      status: ElectionCommissionStatus.Active,
    });
    expect(commission.canRunVote()).toBe(true);
    expect(commission.pullEvents()[0]).toBeInstanceOf(
      ElectionCommissionCreated,
    );
  });

  it('rejects an empty commission name', () => {
    expect(() =>
      ElectionCommissionAggregate.create({
        id: 'commission-2',
        name: '   ',
        createdAt: new Date('2026-08-13T00:00:00.000Z'),
      }),
    ).toThrow(DomainError);
  });

  it('suspends and reactivates a commission', () => {
    const commission = ElectionCommissionAggregate.create({
      id: 'commission-3',
      name: 'Regional Commission',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    commission.suspend(new Date('2026-08-14T00:00:00.000Z'));
    expect(commission.status).toBe(ElectionCommissionStatus.Suspended);
    expect(commission.canRunVote()).toBe(false);

    commission.reactivate(new Date('2026-08-15T00:00:00.000Z'));
    expect(commission.status).toBe(ElectionCommissionStatus.Active);
    expect(commission.canRunVote()).toBe(true);
  });

  it('registers an active field manager for a commission', () => {
    const member = ElectionCommissionMemberAggregate.create({
      id: 'member-1',
      commissionId: 'commission-1',
      name: 'Kim Manager',
      role: ElectionCommissionMemberRole.FieldManager,
      registeredAt: new Date('2026-08-13T00:00:00.000Z'),
    });

    expect(member).toMatchObject({
      id: 'member-1',
      commissionId: 'commission-1',
      name: 'Kim Manager',
      role: ElectionCommissionMemberRole.FieldManager,
      status: ElectionCommissionMemberStatus.Active,
    });
    expect(member.canManageFieldVoting('commission-1')).toBe(true);
    expect(member.canManageFieldVoting('commission-other')).toBe(false);
    expect(member.pullEvents()[0]).toBeInstanceOf(
      ElectionCommissionMemberRegistered,
    );
  });

  it('exposes voting channel runtime constants', () => {
    expect(Object.values(VotingChannel)).toEqual([
      'ONLINE',
      'ONSITE',
      'VISIT',
    ]);
  });
});
