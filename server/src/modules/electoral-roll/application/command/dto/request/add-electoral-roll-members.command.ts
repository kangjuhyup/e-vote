import { InvalidElectoralRollMemberBatchError } from '../../electoral-roll.error';

export const MAX_ELECTORAL_ROLL_MEMBER_BATCH_SIZE = 50_000;

type AddElectoralRollMemberInput = {
  readonly identifier: string;
  readonly groupKey?: string;
  readonly voteWeight?: number;
  readonly name?: string;
  readonly phoneNumber?: string;
  readonly birthDate?: string;
};

export class AddElectoralRollMembersCommand {
  private constructor(
    readonly userPrincipalId: string,
    readonly electoralRollId: string,
    readonly members: readonly AddElectoralRollMemberInput[],
    readonly changedAt: Date,
  ) {}

  static of(params: {
    readonly userPrincipalId: string;
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
        name: member.name,
        phoneNumber: member.phoneNumber,
        birthDate: member.birthDate,
        groupKey: member.groupKey,
        voteWeight: member.voteWeight,
      };
    });

    return new AddElectoralRollMembersCommand(
      params.userPrincipalId,
      params.electoralRollId,
      members,
      params.changedAt,
    );
  }
}

function isMemberInput(value: unknown): value is AddElectoralRollMemberInput {
  if (!value || typeof value !== 'object') return false;

  const input = value as Record<string, unknown>;
  const hasName = input.name !== undefined;
  const hasPhoneNumber = input.phoneNumber !== undefined;
  return (
    typeof input.identifier === 'string' &&
    hasName === hasPhoneNumber &&
    (input.birthDate === undefined || hasName) &&
    (input.name === undefined ||
      (typeof input.name === 'string' && input.name.trim().length > 0)) &&
    (input.phoneNumber === undefined ||
      (typeof input.phoneNumber === 'string' &&
        hasValidPhoneNumber(input.phoneNumber))) &&
    (input.birthDate === undefined ||
      (typeof input.birthDate === 'string' &&
        hasValidBirthDate(input.birthDate))) &&
    (input.groupKey === undefined || typeof input.groupKey === 'string') &&
    (input.voteWeight === undefined || typeof input.voteWeight === 'number')
  );
}

function hasValidPhoneNumber(value: string): boolean {
  const digitCount = value.replace(/\D/g, '').length;
  return digitCount >= 8 && digitCount <= 15;
}

function hasValidBirthDate(value: string): boolean {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === normalized
  );
}
