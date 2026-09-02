import type { ElectoralRollAggregate } from '../../../../domain/electoral-roll.aggregate';
import type { ElectoralRollMemberAggregate } from '../../../../domain/electoral-roll-member.aggregate';

export const ELECTORAL_ROLL_REPOSITORY_PORT = Symbol(
  'ELECTORAL_ROLL_REPOSITORY_PORT',
);

export interface ElectoralRollRepositoryPort {
  nextId(): string;
  nextMemberId(): string;
  findById(
    electoralRollId: string,
    userPrincipalId: string,
  ): Promise<ElectoralRollAggregate | undefined>;
  findMemberById(
    electoralRollId: string,
    memberId: string,
  ): Promise<ElectoralRollMemberAggregate | undefined>;
  findMembersByRollId(
    electoralRollId: string,
  ): Promise<readonly ElectoralRollMemberAggregate[]>;
  create(
    electoralRoll: ElectoralRollAggregate,
    userPrincipalId: string,
  ): Promise<void>;
  save(electoralRoll: ElectoralRollAggregate): Promise<void>;
  saveMember(member: ElectoralRollMemberAggregate): Promise<void>;
  saveMembers(members: readonly ElectoralRollMemberAggregate[]): Promise<void>;
  removeMember(electoralRollId: string, memberId: string): Promise<void>;
}
