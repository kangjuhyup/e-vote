import { Injectable } from '@nestjs/common';
import type { IntegrationEventEnvelope } from '../../../../shared/application/messaging/integration-event-envelope';
import type { IntegrationEventPublisherPort } from '../../../../shared/application/port/messaging/integration-event-publisher.port';

@Injectable()
export class NotConfiguredIntegrationEventPublisherAdapter implements IntegrationEventPublisherPort {
  publish(message: IntegrationEventEnvelope): Promise<void> {
    void message;
    return Promise.reject(
      new Error('integration event publisher is not configured'),
    );
  }
}
