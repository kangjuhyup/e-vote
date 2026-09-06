export class ProcessDueVoteSchedulesCommand {
  private constructor(
    readonly now: Date,
    readonly batchSize: number,
  ) {}

  static of(params: {
    readonly now: Date;
    readonly batchSize: number;
  }): ProcessDueVoteSchedulesCommand {
    if (!Number.isFinite(params.now.getTime())) {
      throw new TypeError('schedule processing time must be a valid date');
    }
    if (!Number.isInteger(params.batchSize) || params.batchSize < 1) {
      throw new TypeError('schedule batch size must be a positive integer');
    }

    return new ProcessDueVoteSchedulesCommand(params.now, params.batchSize);
  }
}
