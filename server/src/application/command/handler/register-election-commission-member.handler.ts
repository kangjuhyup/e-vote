import { Inject, Injectable } from '@nestjs/common';
import { ElectionCommissionMemberAggregate } from '../../../domain/election-commission/election-commission-member.aggregate';
import { ElectionCommissionMemberStatus } from '../../../domain/election-commission/type/election-commission-member-status.type';
import { ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-member-repository.port';
import type { ElectionCommissionMemberRepositoryPort } from '../../port/persistence/command/election-commission-member-repository.port';
import { ELECTION_COMMISSION_REPOSITORY_PORT } from '../../port/persistence/command/election-commission-repository.port';
import type { ElectionCommissionRepositoryPort } from '../../port/persistence/command/election-commission-repository.port';
import { RegisterElectionCommissionMemberCommand } from '../register-election-commission-member.command';

export type RegisterElectionCommissionMemberResult = {
  id: string;
  commissionId: string;
  status: ElectionCommissionMemberStatus;
};

export class ElectionCommissionNotFoundError extends Error {
  constructor() {
    super('election commission not found');
  }
}

export class ElectionCommissionUnavailableError extends Error {
  constructor() {
    super('election commission is not active');
  }
}

@Injectable()
export class RegisterElectionCommissionMemberHandler {
  constructor(
    @Inject(ELECTION_COMMISSION_REPOSITORY_PORT)
    private readonly electionCommissionRepository: ElectionCommissionRepositoryPort,
    @Inject(ELECTION_COMMISSION_MEMBER_REPOSITORY_PORT)
    private readonly electionCommissionMemberRepository: ElectionCommissionMemberRepositoryPort,
  ) {}

  async execute(
    command: RegisterElectionCommissionMemberCommand,
  ): Promise<RegisterElectionCommissionMemberResult> {
    const commission = await this.electionCommissionRepository.findById(
      command.commissionId,
    );

    if (!commission) {
      throw new ElectionCommissionNotFoundError();
    }

    if (!commission.canRunVote()) {
      throw new ElectionCommissionUnavailableError();
    }

    const member = ElectionCommissionMemberAggregate.create({
      id: this.electionCommissionMemberRepository.nextId(),
      commissionId: command.commissionId,
      name: command.name,
      role: command.role,
      registeredAt: command.registeredAt,
    });

    await this.electionCommissionMemberRepository.save(member);

    return {
      id: member.id,
      commissionId: member.commissionId,
      status: member.status,
    };
  }
}
