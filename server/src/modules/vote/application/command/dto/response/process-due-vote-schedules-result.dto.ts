export class ProcessDueVoteSchedulesResult {
  private constructor(
    readonly openedCount: number,
    readonly closedCount: number,
  ) {}

  static of(params: {
    readonly openedCount: number;
    readonly closedCount: number;
  }): ProcessDueVoteSchedulesResult {
    return new ProcessDueVoteSchedulesResult(
      params.openedCount,
      params.closedCount,
    );
  }

  get processedCount(): number {
    return this.openedCount + this.closedCount;
  }
}
