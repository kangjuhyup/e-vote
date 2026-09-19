import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { BillingPaymentFailureRepositoryPort } from '../../../../application/port/persistence/command/billing-payment-failure-repository.port';

@Injectable()
export class BillingPaymentFailureRepositoryAdapter implements BillingPaymentFailureRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async record(input: {
    billingOrderId: string;
    failureCode: string;
    failureMessage?: string;
    reportedAt: Date;
  }): Promise<void> {
    await this.em.getConnection().execute(
      `insert into billing_payment_failures (billing_order_id, failure_code, failure_message, reported_at)
       values (?, ?, ?, ?)
       on conflict (billing_order_id) do update
       set failure_code = excluded.failure_code,
           failure_message = excluded.failure_message,
           reported_at = excluded.reported_at`,
      [
        input.billingOrderId,
        input.failureCode,
        input.failureMessage ?? null,
        input.reportedAt,
      ],
    );
  }
}
