import type { DatabaseEntityFactoryContext } from '../../../../database/entity/entity-factory-context';

export type IntegrationOutboxStatus =
  'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'DEAD';

export function createIntegrationOutboxEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const IntegrationOutboxSchema = defineEntity({
    name: 'IntegrationOutboxEntity',
    tableName: 'integration_outbox',
    uniques: [
      {
        name: 'integration_outbox_deduplication_key_unique',
        properties: ['deduplicationKey'],
      },
      {
        name: 'integration_outbox_transition_unique',
        properties: [
          'source',
          'aggregateType',
          'aggregateId',
          'aggregateVersion',
          'eventType',
          'eventPosition',
        ],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      deduplicationKey: p.string().length(500).fieldName('deduplication_key'),
      source: p.string().length(100),
      eventType: p.string().length(200).fieldName('event_type'),
      schemaVersion: p.integer().fieldName('schema_version'),
      aggregateType: p.string().length(100).fieldName('aggregate_type'),
      aggregateId: p.uuid().fieldName('aggregate_id'),
      aggregateVersion: p.integer().fieldName('aggregate_version'),
      eventPosition: p.integer().fieldName('event_position'),
      payload: p.json().$type<Readonly<Record<string, unknown>>>(),
      correlationId: p.string().fieldName('correlation_id').nullable(),
      causationId: p.string().fieldName('causation_id').nullable(),
      occurredAt: p.datetime().fieldName('occurred_at'),
      createdAt: p.datetime().fieldName('created_at'),
      status: p.string().$type<IntegrationOutboxStatus>(),
      availableAt: p.datetime().fieldName('available_at'),
      claimCount: p.integer().fieldName('claim_count'),
      publishAttemptCount: p.integer().fieldName('publish_attempt_count'),
      lockedBy: p.string().fieldName('locked_by').nullable(),
      lockToken: p.uuid().fieldName('lock_token').nullable(),
      lockedUntil: p.datetime().fieldName('locked_until').nullable(),
      publishedAt: p.datetime().fieldName('published_at').nullable(),
      lastError: p.text().fieldName('last_error').nullable(),
    },
  });

  class IntegrationOutboxEntity extends IntegrationOutboxSchema.class {}
  IntegrationOutboxSchema.setClass(IntegrationOutboxEntity);

  return { IntegrationOutboxEntity };
}
