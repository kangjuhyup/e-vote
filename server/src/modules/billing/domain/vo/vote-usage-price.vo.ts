import { DomainError } from '../../../../shared/domain/domain-error';
import { Money } from './money.vo';

export class VoteUsagePrice {
  private constructor(
    readonly productCode: string,
    readonly productName: string,
    readonly electorCount: number,
    readonly pricingUnitSize: number,
    readonly pricingUnitCount: number,
    readonly unitPrice: Money,
    readonly money: Money,
  ) {}

  static forElectorCount(electorCount: number): VoteUsagePrice {
    const pricingUnitSize = 100;
    const pricingUnitCount = Math.ceil(electorCount / pricingUnitSize);

    return VoteUsagePrice.reconstitute({
      productCode: 'VOTE_USAGE',
      productName: '투표 개설 이용료',
      electorCount,
      pricingUnitSize,
      pricingUnitCount,
      unitPrice: 3_000,
      amount: pricingUnitCount * 3_000,
      currency: 'KRW',
    });
  }

  static reconstitute(params: {
    productCode: string;
    productName: string;
    electorCount: number;
    pricingUnitSize: number;
    pricingUnitCount: number;
    unitPrice: number;
    amount: number;
    currency: string;
  }): VoteUsagePrice {
    const productCode = params.productCode.trim();
    const productName = params.productName.trim();

    if (!/^[A-Z0-9_]+$/.test(productCode)) {
      throw new DomainError(
        'vote usage product code must contain only uppercase letters, numbers, and underscores',
      );
    }
    if (productName.length === 0) {
      throw new DomainError('vote usage product name must not be empty');
    }
    if (
      !Number.isSafeInteger(params.electorCount) ||
      params.electorCount <= 0
    ) {
      throw new DomainError('vote usage elector count must be positive');
    }
    if (
      !Number.isSafeInteger(params.pricingUnitSize) ||
      params.pricingUnitSize <= 0
    ) {
      throw new DomainError('vote usage pricing unit size must be positive');
    }
    if (
      !Number.isSafeInteger(params.pricingUnitCount) ||
      params.pricingUnitCount !==
        Math.ceil(params.electorCount / params.pricingUnitSize)
    ) {
      throw new DomainError('vote usage pricing unit count is invalid');
    }

    const unitPrice = Money.of({
      amount: params.unitPrice,
      currency: params.currency,
    });
    const money = Money.of({
      amount: params.amount,
      currency: params.currency,
    });
    if (money.amount !== unitPrice.amount * params.pricingUnitCount) {
      throw new DomainError('vote usage total price is invalid');
    }

    return Object.freeze(
      new VoteUsagePrice(
        productCode,
        productName,
        params.electorCount,
        params.pricingUnitSize,
        params.pricingUnitCount,
        unitPrice,
        money,
      ),
    );
  }
}
