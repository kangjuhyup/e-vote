export class CreateElectoralRollResult {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly revision: number,
  ) {}

  static of(params: {
    readonly id: string;
    readonly name: string;
    readonly revision: number;
  }): CreateElectoralRollResult {
    return new CreateElectoralRollResult(
      params.id,
      params.name,
      params.revision,
    );
  }
}
