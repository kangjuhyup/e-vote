import { DomainError } from '../../../../shared/domain/domain-error';

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static of(params: { amount: number; currency: string }): Money {
    const currency = params.currency.trim().toUpperCase();

    if (!Number.isSafeInteger(params.amount) || params.amount <= 0) {
      throw new DomainError('money amount must be a positive safe integer');
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainError('money currency must be a three-letter code');
    }

    return Object.freeze(new Money(params.amount, currency));
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
