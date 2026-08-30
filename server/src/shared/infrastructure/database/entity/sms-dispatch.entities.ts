import {
  getEntity,
  type DatabaseEntityFactoryContext,
} from '../../../../platform/database/entity/entity-factory-context';
import type { SmsDeliveryStatus } from '../../../domain/sms/type/sms-delivery-status.type';
import type { SmsMessagePurpose } from '../../../domain/voting/type/sms-message-purpose.type';

export function createSmsDispatchEntities(
  context: DatabaseEntityFactoryContext,
): Partial<
  import('../../../../platform/database/entity/entity-factory-context').DatabaseEntityClasses
> {
  const { defineEntity, p } = context;

  const SmsDispatchSchema = defineEntity({
    name: 'SmsDispatchEntity',
    tableName: 'sms_dispatches',
    properties: {
      id: p.uuid().primary(),
      vote: () =>
        p
          .manyToOne(getEntity(context, 'VoteEntity'))
          .fieldName('vote_id')
          .inversedBy('smsDispatches')
          .deleteRule('cascade'),
      fieldVotingSession: () =>
        p
          .manyToOne(getEntity(context, 'FieldVotingSessionEntity'))
          .fieldName('field_voting_session_id')
          .inversedBy('smsDispatches')
          .deleteRule('restrict')
          .nullable(),
      purpose: p.string().$type<SmsMessagePurpose>(),
      sentAt: p.datetime().fieldName('sent_at'),
      recipientCount: p.integer().fieldName('recipient_count'),
      successCount: p.integer().fieldName('success_count'),
      failureCount: p.integer().fieldName('failure_count'),
      createdAt: p.datetime().fieldName('created_at'),
      deliveries: () =>
        p
          .oneToMany(getEntity(context, 'SmsDeliveryEntity'))
          .mappedBy('dispatch'),
    },
  });
  class SmsDispatchEntity extends SmsDispatchSchema.class {}
  SmsDispatchSchema.setClass(SmsDispatchEntity);

  const SmsDeliverySchema = defineEntity({
    name: 'SmsDeliveryEntity',
    tableName: 'sms_deliveries',
    uniques: [
      {
        name: 'sms_deliveries_dispatch_id_elector_id_unique',
        properties: ['dispatch', 'electorId'],
      },
    ],
    properties: {
      id: p.uuid().primary(),
      dispatch: () =>
        p
          .manyToOne(getEntity(context, 'SmsDispatchEntity'))
          .fieldName('dispatch_id')
          .inversedBy('deliveries')
          .deleteRule('cascade'),
      electorId: p.uuid().fieldName('elector_id'),
      recipientName: p.string().fieldName('recipient_name'),
      recipientIdentifier: p.string().fieldName('recipient_identifier'),
      status: p.string().$type<SmsDeliveryStatus>(),
      failureReason: p.text().fieldName('failure_reason').nullable(),
      createdAt: p.datetime().fieldName('created_at'),
    },
  });
  class SmsDeliveryEntity extends SmsDeliverySchema.class {}
  SmsDeliverySchema.setClass(SmsDeliveryEntity);

  return { SmsDispatchEntity, SmsDeliveryEntity };
}
