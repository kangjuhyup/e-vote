import { InvalidElectoralRollMemberBatchError } from '../../electoral-roll.error';

export const MAX_ELECTORAL_ROLL_MEMBER_BATCH_SIZE = 50_000;

type AddElectoralRollMemberInput = {
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight?: number;
};

export class AddElectoralRollMembersCommand {
  private constructor(
    readonly electoralRollId: string,
    readonly members: readonly AddElectoralRollMemberInput[],
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly electoralRollId: string;
    readonly members: unknown;
    readonly changedAt: Date;
  }): AddElectoralRollMembersCommand {
    if (
      !Array.isArray(params.members) ||
      params.members.length < 1 ||
      params.members.length > MAX_ELECTORAL_ROLL_MEMBER_BATCH_SIZE
    ) {
      throw new InvalidElectoralRollMemberBatchError(
        MAX_ELECTORAL_ROLL_MEMBER_BATCH_SIZE,
      );
    }

    const rawMembers: readonly unknown[] = params.members;
    const members = rawMembers.map((member, index) => {
      if (!isMemberInput(member)) {
        throw new InvalidElectoralRollMemberBatchError(
          `electoral roll member at index ${index} is invalid`,
        );
      }

      return {
        identifier: member.identifier,
        groupKey: member.groupKey,
        voteWeight: member.voteWeight,
      };
    });

    return new AddElectoralRollMembersCommand(
      params.electoralRollId,
      members,
      params.changedAt,
    );
  }
}

function isMemberInput(value: unknown): value is AddElectoralRollMemberInput {
  if (!value || typeof value !== 'object') return false;

  const input = value as Record<string, unknown>;
  return (
    typeof input.identifier === 'string' &&
    (input.groupKey === undefined || typeof input.groupKey === 'string') &&
    (input.voteWeight === undefined || typeof input.voteWeight === 'number')
  );
}
