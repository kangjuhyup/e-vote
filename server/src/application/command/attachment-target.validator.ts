import { Inject, Injectable } from '@nestjs/common';
import {
  AttachmentTarget,
  AttachmentTargetType,
} from '../port/attachment-repository.port';
import { CANDIDATE_REPOSITORY_PORT } from '../port/candidate-repository.port';
import type { CandidateRepositoryPort } from '../port/candidate-repository.port';
import { VOTE_DETAIL_REPOSITORY_PORT } from '../port/vote-detail-repository.port';
import type { VoteDetailRepositoryPort } from '../port/vote-detail-repository.port';
import { VOTE_REPOSITORY_PORT } from '../port/vote-repository.port';
import type { VoteRepositoryPort } from '../port/vote-repository.port';

export class AttachmentTargetNotFoundError extends Error {
  constructor() {
    super('attachment target not found');
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

  private async assertVoteExists(voteId: string): Promise<void> {
    const vote = await this.voteRepository.findById(voteId);

    if (!vote) {
      throw new AttachmentTargetNotFoundError();
    }
  }
}
