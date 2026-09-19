export class ProcessDueVoteSchedulesResult {
  private constructor(
    readonly openedCount: number,
    readonly closedCount: number,
    readonly canceledCount: number,
  ) {}

  static of(params: {
    readonly openedCount: number;
    readonly closedCount: number;
    readonly canceledCount: number;
  }): ProcessDueVoteSchedulesResult {
    return new ProcessDueVoteSchedulesResult(
      params.openedCount,
      params.closedCount,
      params.canceledCount,
    );
  }

  get processedCount(): number {
    return this.openedCount + this.closedCount + this.canceledCount;
  }
}
