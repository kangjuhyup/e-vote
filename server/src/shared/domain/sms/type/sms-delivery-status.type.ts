export const SmsDeliveryStatus = {
  Success: 'SUCCESS',
  Failure: 'FAILURE',
} as const;

export type SmsDeliveryStatus =
  (typeof SmsDeliveryStatus)[keyof typeof SmsDeliveryStatus];
