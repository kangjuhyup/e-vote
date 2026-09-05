import type { IntegrationEventEnvelope } from '../../messaging/integration-event-envelope';

export const INTEGRATION_EVENT_OUTBOX_PORT = Symbol(
  'INTEGRATION_EVENT_OUTBOX_PORT',
);

export interface IntegrationEventOutboxPort {
  append(messages: readonly IntegrationEventEnvelope[]): Promise<void>;
}
