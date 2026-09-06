import { createId } from '../../../../shared/domain/id';
import {
  InvalidParticipationInvitationError,
  ParticipationInvitationAlreadyClaimedError,
} from './participation-access.error';

export interface ParticipationInvitationState {
  readonly id: string;
  readonly voteId: string;
  readonly electorId: string;
  readonly tokenDigest: string;
  readonly signingKeyId: string;
  readonly generation: number;
  readonly claimedAt?: Date;
  readonly claimedSessionId?: string;
  readonly revokedAt?: Date;
  readonly issuedByUserPrincipalId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class ParticipationInvitationAggregate {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly electorId: string,
    public tokenDigest: string,
    public signingKeyId: string,
    public generation: number,
    public claimedAt: Date | undefined,
    public claimedSessionId: string | undefined,
    public revokedAt: Date | undefined,
    public issuedByUserPrincipalId: string,
    readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static issue(params: {
    readonly id: string;
    readonly voteId: string;
    readonly electorId: string;
    readonly tokenDigest: string;
    readonly signingKeyId: string;
    readonly issuedByUserPrincipalId: string;
    readonly now: Date;
  }): ParticipationInvitationAggregate {
    return ParticipationInvitationAggregate.reconstitute({
      ...params,
      generation: 1,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  static reconstitute(
    state: ParticipationInvitationState,
  ): ParticipationInvitationAggregate {
    if (
      state.generation < 0 ||
      !Number.isSafeInteger(state.generation) ||
      state.tokenDigest.trim().length === 0 ||
      state.signingKeyId.trim().length === 0 ||
      state.issuedByUserPrincipalId.trim().length === 0
    ) {
      throw new InvalidParticipationInvitationError();
    }

    return new ParticipationInvitationAggregate(
      createId(state.id),
      createId(state.voteId),
      createId(state.electorId),
      state.tokenDigest,
      state.signingKeyId,
      state.generation,
      state.claimedAt,
      state.claimedSessionId,
      state.revokedAt,
      state.issuedByUserPrincipalId,
      state.createdAt,
      state.updatedAt,
    );
  }

  assertCurrentToken(generation: number, tokenDigest: string): void {
    if (
      this.revokedAt ||
      this.generation !== generation ||
      this.tokenDigest !== tokenDigest
    ) {
      throw new InvalidParticipationInvitationError();
    }
  }

  claimForParticipation(sessionId: string, now: Date): void {
    if (this.revokedAt) {
      throw new InvalidParticipationInvitationError();
    }

    if (this.claimedSessionId && this.claimedSessionId !== sessionId) {
      throw new ParticipationInvitationAlreadyClaimedError();
    }

    if (!this.claimedSessionId) {
      this.claimedSessionId = createId(sessionId);
      this.claimedAt = now;
      this.updatedAt = now;
    }
  }

  assertResultAccessAllowed(generation: number, tokenDigest: string): void {
    this.assertCurrentToken(generation, tokenDigest);
  }

  rotate(params: {
    readonly tokenDigest: string;
    readonly signingKeyId: string;
    readonly issuedByUserPrincipalId: string;
    readonly now: Date;
  }): void {
    if (
      params.tokenDigest.trim().length === 0 ||
      params.signingKeyId.trim().length === 0 ||
      params.issuedByUserPrincipalId.trim().length === 0
    ) {
      throw new InvalidParticipationInvitationError();
    }

    this.generation += 1;
    this.tokenDigest = params.tokenDigest;
    this.signingKeyId = params.signingKeyId;
    this.issuedByUserPrincipalId = params.issuedByUserPrincipalId;
    this.claimedAt = undefined;
    this.claimedSessionId = undefined;
    this.revokedAt = undefined;
    this.updatedAt = params.now;
  }

  revoke(now: Date): void {
    if (!this.revokedAt) {
      this.revokedAt = now;
      this.updatedAt = now;
    }
  }
}
