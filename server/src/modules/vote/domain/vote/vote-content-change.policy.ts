import { DomainError } from '../../../../shared/domain/domain-error';

export type VoteContentChangeStatus =
  'PENDING' | 'APPROVED' | 'REJECTED' | 'INVALIDATED';

export type VoteContentAttachmentChange =
  | { action: 'ADD'; fileId: string }
  | { action: 'REMOVE'; attachmentId: string };

export type VoteContentChangeProposal = {
  title?: string;
  description?: string;
  endedAt?: string;
  attachmentChanges: VoteContentAttachmentChange[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class VoteContentChangePolicy {
  static assertOpen(status: string, endedAt: Date, now: Date): void {
    if (status !== 'OPEN' || endedAt.getTime() <= now.getTime()) {
      throw new DomainError('only an open vote before its end can be changed');
    }
  }

  static normalizeProposal(
    proposal: VoteContentChangeProposal,
    startedAt: Date,
    now: Date,
  ): VoteContentChangeProposal {
    if (
      !proposal ||
      !Array.isArray(proposal.attachmentChanges) ||
      proposal.attachmentChanges.some(
        (change) =>
          !change ||
          (change.action !== 'ADD' && change.action !== 'REMOVE') ||
          (change.action === 'ADD' &&
            (typeof change.fileId !== 'string' ||
              !UUID_PATTERN.test(change.fileId))) ||
          (change.action === 'REMOVE' &&
            (typeof change.attachmentId !== 'string' ||
              !UUID_PATTERN.test(change.attachmentId))),
      )
    ) {
      throw new DomainError('invalid attachment changes');
    }
    const title = proposal.title?.trim();
    if (title !== undefined && (title.length === 0 || title.length > 255)) {
      throw new DomainError('vote title must be between 1 and 255 characters');
    }
    if (
      proposal.description !== undefined &&
      proposal.description.length > 10000
    ) {
      throw new DomainError('vote description is too long');
    }
    if (proposal.endedAt !== undefined) {
      const endedAt = new Date(proposal.endedAt);
      if (
        !Number.isFinite(endedAt.getTime()) ||
        endedAt.getTime() <= now.getTime() ||
        endedAt.getTime() <= startedAt.getTime()
      ) {
        throw new DomainError('proposed vote end must be in the future');
      }
    }
    if (
      title === undefined &&
      proposal.description === undefined &&
      proposal.endedAt === undefined &&
      proposal.attachmentChanges.length === 0
    ) {
      throw new DomainError('content change must contain at least one change');
    }
    if (proposal.attachmentChanges.length > 50) {
      throw new DomainError('too many attachment changes');
    }
    const ids = proposal.attachmentChanges.map((change) =>
      change.action === 'ADD'
        ? `file:${change.fileId}`
        : `attachment:${change.attachmentId}`,
    );
    if (new Set(ids).size !== ids.length) {
      throw new DomainError('duplicate attachment change');
    }
    return {
      ...(title !== undefined ? { title } : {}),
      ...(proposal.description !== undefined
        ? { description: proposal.description }
        : {}),
      ...(proposal.endedAt !== undefined
        ? { endedAt: new Date(proposal.endedAt).toISOString() }
        : {}),
      attachmentChanges: proposal.attachmentChanges,
    };
  }
}
