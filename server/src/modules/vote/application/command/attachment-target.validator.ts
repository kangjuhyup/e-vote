import { Inject, Injectable } from '@nestjs/common';
import {
  AttachmentTarget,
  AttachmentTargetType,
} from '../port/persistence/command/attachment-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from '../port/persistence/command/candidate-repository.port';
import type { CandidateRepositoryPort } from '../port/persistence/command/candidate-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../port/persistence/command/vote-detail-repository.port';
import type { VoteDetailRepositoryPort } from '../port/persistence/command/vote-detail-repository.port';
import { VOTE_REPOSITORY_PORT } from '../port/persistence/command/vote-repository.port';
import type { VoteRepositoryPort } from '../port/persistence/command/vote-repository.port';

export class AttachmentTargetNotFoundError extends Error {
  constructor() {
    super('attachment target not found');
  }
}

export class AttachmentAccessDeniedError extends Error {
  constructor() {
    super('only the vote creator can manage attachments');
  }
}

@Injectable()
export class AttachmentTargetValidator {
  constructor(
    @Inject(VOTE_REPOSITORY_PORT)
    private readonly voteRepository: VoteRepositoryPort,
    @Inject(VOTE_DETAIL_REPOSITORY_PORT)
    private readonly voteDetailRepository: VoteDetailRepositoryPort,
    @Inject(CANDIDATE_REPOSITORY_PORT)
    private readonly candidateRepository: CandidateRepositoryPort,
  ) {}

  async assertExists(target: AttachmentTarget): Promise<void> {
    if (target.targetType === AttachmentTargetType.Vote) {
      await this.assertVoteExists(target.voteId);
      return;
    }

    const voteDetail = await this.voteDetailRepository.findById(
      target.voteDetailId,
    );

    if (!voteDetail || voteDetail.voteId !== target.voteId) {
      throw new AttachmentTargetNotFoundError();
    }

    if (target.targetType === AttachmentTargetType.VoteDetail) {
      return;
    }

    const candidate = await this.candidateRepository.findById(
      target.candidateId,
    );

    if (!candidate || candidate.voteDetailId !== target.voteDetailId) {
      throw new AttachmentTargetNotFoundError();
    }
  }

  async assertMutable(
    target: AttachmentTarget,
    action: 'created' | 'deleted' = 'created',
  ): Promise<void> {
    const vote = await this.voteRepository.findById(target.voteId);
    if (!vote) throw new AttachmentTargetNotFoundError();
    vote.assertChildResourcesMutable(action);

    if (target.targetType === AttachmentTargetType.Vote) return;

    const voteDetail = await this.voteDetailRepository.findById(
      target.voteDetailId,
    );
    if (!voteDetail || !voteDetail.belongsToVote(vote.id)) {
      throw new AttachmentTargetNotFoundError();
    }
    voteDetail.assertChildResourcesMutable(action);

    if (target.targetType === AttachmentTargetType.VoteDetail) return;

    const candidate = await this.candidateRepository.findById(
      target.candidateId,
    );
    if (!candidate || !candidate.belongsToVoteDetail(voteDetail.id)) {
      throw new AttachmentTargetNotFoundError();
    }
  }

  async assertOwnedBy(
    target: AttachmentTarget,
    userPrincipalId: string,
  ): Promise<void> {
    const vote = await this.voteRepository.findById(target.voteId);
    if (!vote) throw new AttachmentTargetNotFoundError();
    if (!vote.isCreatedBy(userPrincipalId)) {
      throw new AttachmentAccessDeniedError();
    }

    if (target.targetType === AttachmentTargetType.Vote) return;

    const voteDetail = await this.voteDetailRepository.findById(
      target.voteDetailId,
    );
    if (!voteDetail || voteDetail.voteId !== target.voteId) {
      throw new AttachmentTargetNotFoundError();
    }
    if (target.targetType === AttachmentTargetType.VoteDetail) return;

    const candidate = await this.candidateRepository.findById(
      target.candidateId,
    );
    if (!candidate || candidate.voteDetailId !== target.voteDetailId) {
      throw new AttachmentTargetNotFoundError();
    }
  }

  private async assertVoteExists(voteId: string): Promise<void> {
    const vote = await this.voteRepository.findById(voteId);

    if (!vote) {
      throw new AttachmentTargetNotFoundError();
    }
  }
}
