import type { IntegrationEventEnvelope } from '../../messaging/integration-event-envelope';

export const INTEGRATION_EVENT_PUBLISHER_PORT = Symbol(
  'INTEGRATION_EVENT_PUBLISHER_PORT',
);

export interface IntegrationEventPublisherPort {
  publish(message: IntegrationEventEnvelope): Promise<void>;
}
