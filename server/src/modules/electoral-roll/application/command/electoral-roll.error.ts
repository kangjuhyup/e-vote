export class ElectoralRollNotFoundError extends Error {
  constructor() {
    super('electoral roll not found');
  }
}

export class ElectoralRollMemberNotFoundError extends Error {
  constructor() {
    super('electoral roll member not found');
  }
}

export class InvalidElectoralRollMemberBatchError extends Error {
  constructor(reason: number | string) {
    super(
      typeof reason === 'number'
        ? `electoral roll member batch must contain between 1 and ${reason} members`
        : reason,
    );
  }
}

export class DuplicateElectoralRollMemberIdentifierError extends Error {
  constructor(identifier: string) {
    super(`duplicate electoral roll member identifier: ${identifier}`);
  }
}
