import { DomainError } from '../../../shared/domain/domain-error';

export class ParticipationInvitationUnavailableError extends DomainError {
  constructor(readonly reason: 'EXPIRED' | 'REVOKED') {
    super(
      reason === 'EXPIRED'
        ? 'participation invitation has expired'
        : 'participation invitation has been revoked',
    );
  }
}

export class ParticipationInvitationAggregate {
  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly electorId: string,
    private tokenDigestValue: string,
    private expiresAtValue: Date,
    private revokedAtValue: Date | undefined,
    readonly createdAt: Date,
    private updatedAtValue: Date,
  ) {}

  get tokenDigest(): string {
    return this.tokenDigestValue;
  }

  get expiresAt(): Date {
    return this.expiresAtValue;
  }

  get revokedAt(): Date | undefined {
    return this.revokedAtValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  static create(params: {
    id: string;
    voteId: string;
    electorId: string;
    tokenDigest: string;
    expiresAt: Date;
    now: Date;
  }): ParticipationInvitationAggregate {
    if (params.expiresAt <= params.now) {
      throw new DomainError('participation invitation expiry must be future');
    }
    return new ParticipationInvitationAggregate(
      params.id,
      params.voteId,
      params.electorId,
      params.tokenDigest,
      params.expiresAt,
      undefined,
      params.now,
      params.now,
    );
  }

  static reconstitute(params: {
    id: string;
    voteId: string;
    electorId: string;
    tokenDigest: string;
    expiresAt: Date;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }): ParticipationInvitationAggregate {
    return new ParticipationInvitationAggregate(
      params.id,
      params.voteId,
      params.electorId,
      params.tokenDigest,
      params.expiresAt,
      params.revokedAt,
      params.createdAt,
      params.updatedAt,
    );
  }

  rotate(tokenDigest: string, expiresAt: Date, now: Date): void {
    if (expiresAt <= now) {
      throw new DomainError('participation invitation expiry must be future');
    }
    this.tokenDigestValue = tokenDigest;
    this.expiresAtValue = expiresAt;
    this.revokedAtValue = undefined;
    this.updatedAtValue = now;
  }

  revoke(now: Date): void {
    this.revokedAtValue = now;
    this.updatedAtValue = now;
  }

  assertUsable(now: Date): void {
    if (this.revokedAtValue) {
      throw new ParticipationInvitationUnavailableError('REVOKED');
    }
    if (this.expiresAtValue <= now) {
      throw new ParticipationInvitationUnavailableError('EXPIRED');
    }
  }
}
