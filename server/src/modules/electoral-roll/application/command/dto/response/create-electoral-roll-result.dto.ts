export class CreateElectoralRollResult {
  private constructor(
    readonly id: string,
    readonly commissionId: string,
    readonly name: string,
    readonly revision: number,
  ) {}

  static of(params: {
    readonly id: string;
    readonly commissionId: string;
    readonly name: string;
    readonly revision: number;
  }): CreateElectoralRollResult {
    return new CreateElectoralRollResult(
      params.id,
      params.commissionId,
      params.name,
      params.revision,
    );
  }
}
