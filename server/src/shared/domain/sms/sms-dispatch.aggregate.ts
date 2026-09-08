import { DomainError } from '../domain-error';
import { createId } from '../id';
import {
  SmsMessagePurpose,
  type SmsMessagePurpose as SmsMessagePurposeType,
} from '../voting/type/sms-message-purpose.type';
import {
  SmsDeliveryStatus,
  type SmsDeliveryStatus as SmsDeliveryStatusType,
} from './type/sms-delivery-status.type';

export type SmsDeliveryProps = {
  readonly id: string;
  readonly electorId: string;
  readonly recipientName: string;
  readonly recipientIdentifier: string;
  readonly status: SmsDeliveryStatusType;
  readonly failureReason?: string;
  readonly participationInvitationGeneration?: number;
};

export class SmsDelivery {
  readonly failureReason?: string;
  readonly participationInvitationGeneration?: number;

  private constructor(
    readonly id: string,
    readonly electorId: string,
    readonly recipientName: string,
    readonly recipientIdentifier: string,
    readonly status: SmsDeliveryStatusType,
    failureReason: string | undefined,
    participationInvitationGeneration: number | undefined,
  ) {
    if (failureReason !== undefined) this.failureReason = failureReason;
    if (participationInvitationGeneration !== undefined) {
      this.participationInvitationGeneration =
        participationInvitationGeneration;
    }
  }

  static create(params: SmsDeliveryProps): SmsDelivery {
    const recipientName = params.recipientName.trim();
    const recipientIdentifier = params.recipientIdentifier.trim();
    const failureReason = params.failureReason?.trim() || undefined;

    if (recipientName.length === 0) {
      throw new DomainError('SMS recipient name must not be empty');
    }
    if (recipientIdentifier.length === 0) {
      throw new DomainError('SMS recipient identifier must not be empty');
    }
    if (params.status === SmsDeliveryStatus.Success && failureReason) {
      throw new DomainError('successful SMS delivery must not have a reason');
    }
    if (params.status === SmsDeliveryStatus.Failure && !failureReason) {
      throw new DomainError('failed SMS delivery must have a reason');
    }
    if (
      params.participationInvitationGeneration !== undefined &&
      (!Number.isSafeInteger(params.participationInvitationGeneration) ||
        params.participationInvitationGeneration < 1)
    ) {
      throw new DomainError(
        'participation invitation generation must be a positive integer',
      );
    }

    return new SmsDelivery(
      createId(params.id),
      createId(params.electorId),
      recipientName,
      recipientIdentifier,
      params.status,
      failureReason,
      params.participationInvitationGeneration,
    );
  }
}

export class SmsDispatchAggregate {
  readonly fieldVotingSessionId?: string;

  private constructor(
    readonly id: string,
    readonly voteId: string,
    readonly purpose: SmsMessagePurposeType,
    fieldVotingSessionId: string | undefined,
    readonly sentAt: Date,
    readonly deliveries: readonly SmsDelivery[],
  ) {
    if (fieldVotingSessionId !== undefined) {
      this.fieldVotingSessionId = fieldVotingSessionId;
    }
  }

  static create(params: {
    readonly id: string;
    readonly voteId: string;
    readonly purpose: SmsMessagePurposeType;
    readonly fieldVotingSessionId?: string;
    readonly sentAt: Date;
    readonly deliveries: readonly SmsDeliveryProps[];
  }): SmsDispatchAggregate {
    const isFieldSession =
      params.purpose === SmsMessagePurpose.FieldVotingSessionNotice;
    const fieldVotingSessionId = params.fieldVotingSessionId
      ? createId(params.fieldVotingSessionId)
      : undefined;

    if (isFieldSession !== (fieldVotingSessionId !== undefined)) {
      throw new DomainError(
        'field voting session SMS dispatch must identify its session',
      );
    }
    if (Number.isNaN(params.sentAt.getTime())) {
      throw new DomainError('SMS dispatch sentAt must be valid');
    }

    const deliveries = params.deliveries.map((delivery) =>
      SmsDelivery.create(delivery),
    );
    const electorIds = new Set(
      deliveries.map((delivery) => delivery.electorId),
    );
    if (electorIds.size !== deliveries.length) {
      throw new DomainError('SMS dispatch must not contain duplicate electors');
    }

    return new SmsDispatchAggregate(
      createId(params.id),
      createId(params.voteId),
      params.purpose,
      fieldVotingSessionId,
      new Date(params.sentAt),
      deliveries,
    );
  }

  get recipientCount(): number {
    return this.deliveries.length;
  }

  get successCount(): number {
    return this.deliveries.filter(
      (delivery) => delivery.status === SmsDeliveryStatus.Success,
    ).length;
  }

  get failureCount(): number {
    return this.recipientCount - this.successCount;
  }
}
