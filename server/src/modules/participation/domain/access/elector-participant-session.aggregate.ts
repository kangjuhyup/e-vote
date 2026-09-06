import { createId } from '../../../../shared/domain/id';
import {
  InvalidParticipantSessionError,
  ParticipantSessionExpiredError,
  ParticipantSessionScopeDeniedError,
} from './participation-access.error';

export const ParticipantSessionScope = {
  Participate: 'PARTICIPATE',
  ResultRead: 'RESULT_READ',
} as const;

export type ParticipantSessionScope =
  (typeof ParticipantSessionScope)[keyof typeof ParticipantSessionScope];

export interface ElectorParticipantSessionState {
  readonly id: string;
  readonly tokenDigest: string;
  readonly csrfTokenDigest: string;
  readonly invitationId: string;
  readonly voteId: string;
  readonly electorId: string;
  readonly invitationGeneration: number;
  readonly scope: ParticipantSessionScope;
  readonly expiresAt: Date;
  readonly revokedAt?: Date;
  readonly createdAt: Date;
  readonly lastUsedAt: Date;
}

export class ElectorParticipantSessionAggregate {
  private constructor(
    readonly id: string,
    public tokenDigest: string,
    public csrfTokenDigest: string,
    readonly invitationId: string,
    readonly voteId: string,
    readonly electorId: string,
    readonly invitationGeneration: number,
    readonly scope: ParticipantSessionScope,
    readonly expiresAt: Date,
    public revokedAt: Date | undefined,
    readonly createdAt: Date,
    public lastUsedAt: Date,
  ) {}

  static issueParticipation(
    params: Omit<
      ElectorParticipantSessionState,
      'scope' | 'revokedAt' | 'createdAt' | 'lastUsedAt'
    > & { readonly now: Date },
  ): ElectorParticipantSessionAggregate {
    return ElectorParticipantSessionAggregate.reconstitute({
      ...params,
      scope: ParticipantSessionScope.Participate,
      createdAt: params.now,
      lastUsedAt: params.now,
    });
  }

  static issueResultRead(
    params: Omit<
      ElectorParticipantSessionState,
      'scope' | 'revokedAt' | 'createdAt' | 'lastUsedAt'
    > & { readonly now: Date },
  ): ElectorParticipantSessionAggregate {
    return ElectorParticipantSessionAggregate.reconstitute({
      ...params,
      scope: ParticipantSessionScope.ResultRead,
      createdAt: params.now,
      lastUsedAt: params.now,
    });
  }

  static reconstitute(
    state: ElectorParticipantSessionState,
  ): ElectorParticipantSessionAggregate {
    if (
      !Object.values(ParticipantSessionScope).includes(state.scope) ||
      !Number.isSafeInteger(state.invitationGeneration) ||
      state.invitationGeneration < 1 ||
      state.tokenDigest.trim().length === 0 ||
      state.csrfTokenDigest.trim().length === 0
    ) {
      throw new InvalidParticipantSessionError();
    }

    return new ElectorParticipantSessionAggregate(
      createId(state.id),
      state.tokenDigest,
      state.csrfTokenDigest,
      createId(state.invitationId),
      createId(state.voteId),
      createId(state.electorId),
      state.invitationGeneration,
      state.scope,
      state.expiresAt,
      state.revokedAt,
      state.createdAt,
      state.lastUsedAt,
    );
  }

  assertUsable(params: {
    readonly expectedScope: ParticipantSessionScope;
    readonly invitationGeneration: number;
    readonly now: Date;
  }): void {
    if (
      this.revokedAt ||
      this.invitationGeneration !== params.invitationGeneration
    ) {
      throw new InvalidParticipantSessionError();
    }
    if (this.scope !== params.expectedScope) {
      throw new ParticipantSessionScopeDeniedError();
    }
    if (params.now.getTime() >= this.expiresAt.getTime()) {
      throw new ParticipantSessionExpiredError();
    }
    this.lastUsedAt = params.now;
  }

  revoke(now: Date): void {
    this.revokedAt ??= now;
    this.lastUsedAt = now;
  }

  rotateCredentials(params: {
    readonly tokenDigest: string;
    readonly csrfTokenDigest: string;
    readonly now: Date;
  }): void {
    if (!params.tokenDigest.trim() || !params.csrfTokenDigest.trim()) {
      throw new InvalidParticipantSessionError();
    }
    this.tokenDigest = params.tokenDigest;
    this.csrfTokenDigest = params.csrfTokenDigest;
    this.lastUsedAt = params.now;
  }
}
