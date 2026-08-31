import { DomainError } from '../../../../shared/domain/domain-error';

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export class VoteUsageCancellationPolicy {
  static readonly STANDARD_WINDOW_DAYS = 7;

  private constructor(readonly windowDays: number) {}

  static standard(): VoteUsageCancellationPolicy {
    return VoteUsageCancellationPolicy.of({
      windowDays: VoteUsageCancellationPolicy.STANDARD_WINDOW_DAYS,
    });
  }

  static of(params: { windowDays: number }): VoteUsageCancellationPolicy {
    if (!Number.isInteger(params.windowDays) || params.windowDays <= 0) {
      throw new DomainError(
        'vote usage cancellation window days must be a positive integer',
      );
    }
    return new VoteUsageCancellationPolicy(params.windowDays);
  }

  calculateCancelableUntil(issuedAt: Date): Date {
    return new Date(issuedAt.getTime() + this.windowDays * DAY_IN_MILLISECONDS);
  }
}
