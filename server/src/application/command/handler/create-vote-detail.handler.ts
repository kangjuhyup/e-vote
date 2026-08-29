import { Inject, Injectable } from '@nestjs/common';
import { VoteDetailAggregate } from '../../../domain/vote/vote-detail.aggregate';
import { VoteDetailStatus } from '../../../domain/vote/type/vote-status.type';
import { CreateVoteDetailCommand } from '../create-vote-detail.command';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../../port/persistence/command/vote-detail-repository.port';
import type { VoteDetailRepositoryPort } from '../../port/persistence/command/vote-detail-repository.port';

export type CreateVoteDetailResult = {
  id: string;
  voteId: string;
  status: VoteDetailStatus;
};

@Injectable()
export class CreateVoteDetailHandler {
  constructor(
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly voteDetailRepository: VoteDetailRepositoryPort,
  ) {}

  async execute(
    command: CreateVoteDetailCommand,
  ): Promise<CreateVoteDetailResult> {
    const voteDetail = VoteDetailAggregate.create({
      id: this.voteDetailRepository.nextId(),
      voteId: command.voteId,
      title: command.title,
      type: command.type,
      sortOrder: command.sortOrder,
      overrides: command.overrides,
      status: VoteDetailStatus.Draft,
    });

    await this.voteDetailRepository.save(voteDetail);

    return {
      id: voteDetail.id,
      voteId: voteDetail.voteId,
      status: voteDetail.status,
    };
  }
}
