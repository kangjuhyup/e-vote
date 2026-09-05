export type PaymentIntegrationMode = 'disabled' | 'mock';

export const PAYMENT_INTEGRATION_MODE = Symbol('PAYMENT_INTEGRATION_MODE');
export const MOCK_PAYMENT_RANDOM_SOURCE = Symbol('MOCK_PAYMENT_RANDOM_SOURCE');

export type MockPaymentRandomSource = () => number;

type PaymentIntegrationEnvironment = Readonly<
  Record<string, string | undefined>
>;

export function resolvePaymentIntegrationMode(
  env: PaymentIntegrationEnvironment = process.env,
): PaymentIntegrationMode {
  const configuredMode = env.BILLING_PAYMENT_MODE?.trim().toLowerCase();
  if (
    configuredMode !== undefined &&
    configuredMode !== 'disabled' &&
    configuredMode !== 'mock'
  ) {
    throw new Error(
      `unsupported BILLING_PAYMENT_MODE: ${configuredMode || '<empty>'}`,
    );
  }

  if (env.NODE_ENV === 'production' && configuredMode === 'mock') {
    throw new Error('mock billing payments are forbidden in production');
  }

  if (configuredMode) return configuredMode;
  return env.NODE_ENV === 'production' || env.NODE_ENV === 'test'
    ? 'disabled'
    : 'mock';
}
