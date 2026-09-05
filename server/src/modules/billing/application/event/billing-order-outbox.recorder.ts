import { Inject, Injectable } from '@nestjs/common';
import {
  INTEGRATION_EVENT_OUTBOX_PORT,
  type IntegrationEventOutboxPort,
} from '../../../../shared/application/port/messaging/integration-event-outbox.port';
import type { BillingOrderAggregate } from '../../domain/billing-order.aggregate';
import { BillingOrderIntegrationEventMapper } from './billing-order-integration-event.mapper';

@Injectable()
export class BillingOrderOutboxRecorder {
  constructor(
    @Inject(INTEGRATION_EVENT_OUTBOX_PORT)
    private readonly outbox: IntegrationEventOutboxPort,
  ) {}

  async record(order: BillingOrderAggregate): Promise<void> {
    const events = order.domainEvents();
    if (events.length === 0) return;

    await this.outbox.append(
      events.map((event, index) =>
        BillingOrderIntegrationEventMapper.toEnvelope(order, event, index),
      ),
    );
    order.clearDomainEvents();
  }
}
