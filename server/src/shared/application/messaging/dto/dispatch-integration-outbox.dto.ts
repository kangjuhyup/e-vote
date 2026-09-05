export class DispatchIntegrationOutboxRequest {
  private constructor(
    readonly workerId: string,
    readonly batchSize: number,
    readonly leaseDurationMs: number,
  ) {}

  static of(params: {
    readonly workerId: string;
    readonly batchSize: number;
    readonly leaseDurationMs: number;
  }): DispatchIntegrationOutboxRequest {
    return new DispatchIntegrationOutboxRequest(
      params.workerId,
      params.batchSize,
      params.leaseDurationMs,
    );
  }
}

export class DispatchIntegrationOutboxResult {
  private constructor(
    readonly claimedCount: number,
    readonly publishedCount: number,
    readonly rescheduledCount: number,
    readonly deadCount: number,
    readonly lostLeaseCount: number,
  ) {}

  static of(params: {
    readonly claimedCount: number;
    readonly publishedCount: number;
    readonly rescheduledCount: number;
    readonly deadCount: number;
    readonly lostLeaseCount: number;
  }): DispatchIntegrationOutboxResult {
    return new DispatchIntegrationOutboxResult(
      params.claimedCount,
      params.publishedCount,
      params.rescheduledCount,
      params.deadCount,
      params.lostLeaseCount,
    );
  }
}
