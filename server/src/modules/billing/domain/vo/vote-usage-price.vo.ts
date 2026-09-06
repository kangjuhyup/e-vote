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
    readonly baseAmount: number,
    readonly blockchainStorageCount: number,
    readonly blockchainStorageUnitPrice: number,
    readonly blockchainStorageAmount: number,
    readonly money: Money,
  ) {}

  static forElectorCount(
    electorCount: number,
    blockchainStorageCount = 0,
  ): VoteUsagePrice {
    const pricingUnitSize = 100;
    const pricingUnitCount = Math.ceil(electorCount / pricingUnitSize);
    const unitPrice = 3_000;
    const blockchainStorageUnitPrice = 3_000;

    return VoteUsagePrice.reconstitute({
      productCode: 'VOTE_USAGE',
      productName: '투표 개설 이용료',
      electorCount,
      pricingUnitSize,
      pricingUnitCount,
      unitPrice,
      blockchainStorageCount,
      blockchainStorageUnitPrice,
      amount:
        pricingUnitCount * unitPrice +
        blockchainStorageCount * blockchainStorageUnitPrice,
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
    blockchainStorageCount: number;
    blockchainStorageUnitPrice: number;
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
    if (
      !Number.isSafeInteger(params.blockchainStorageCount) ||
      params.blockchainStorageCount < 0
    ) {
      throw new DomainError(
        'vote usage blockchain storage count must be non-negative',
      );
    }
    if (
      !Number.isSafeInteger(params.blockchainStorageUnitPrice) ||
      params.blockchainStorageUnitPrice <= 0
    ) {
      throw new DomainError(
        'vote usage blockchain storage unit price must be positive',
      );
    }

    const unitPrice = Money.of({
      amount: params.unitPrice,
      currency: params.currency,
    });
    const money = Money.of({
      amount: params.amount,
      currency: params.currency,
    });
    const baseAmount = unitPrice.amount * params.pricingUnitCount;
    const blockchainStorageAmount =
      params.blockchainStorageUnitPrice * params.blockchainStorageCount;
    if (money.amount !== baseAmount + blockchainStorageAmount) {
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
        baseAmount,
        params.blockchainStorageCount,
        params.blockchainStorageUnitPrice,
        blockchainStorageAmount,
        money,
      ),
    );
  }
}
