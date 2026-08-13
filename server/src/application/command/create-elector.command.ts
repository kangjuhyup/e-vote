export class CreateElectorCommand {
  private constructor(
    readonly voteId: string,
    readonly name: string,
    readonly identifier: string,
    readonly phoneNumber: string | undefined,
    readonly birthDate: string | undefined,
    readonly groupKey: string | undefined,
    readonly voteWeight: number,
  ) {}

  static of(params: {
    voteId: string;
    name: string;
    identifier: string;
    phoneNumber?: string;
    birthDate?: string;
    groupKey?: string;
    voteWeight?: number;
  }): CreateElectorCommand {
    return new CreateElectorCommand(
      params.voteId,
      params.name,
      params.identifier,
      params.phoneNumber,
      params.birthDate,
      params.groupKey,
      params.voteWeight ?? 1,
    );
  }
}
