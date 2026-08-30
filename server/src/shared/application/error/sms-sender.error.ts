export class SmsSenderNotConfiguredError extends Error {
  constructor() {
    super('sms sender is not configured');
  }
}
