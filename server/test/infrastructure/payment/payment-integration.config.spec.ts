import { resolvePaymentIntegrationMode } from '../../../src/modules/billing/infrastructure/payment/payment-integration.config';

describe('payment integration config', () => {
  it('enables the mock payment adapter by default in development', () => {
    expect(resolvePaymentIntegrationMode({ NODE_ENV: 'development' })).toBe(
      'mock',
    );
  });

  it('keeps payment dispatch disabled by default in tests and production', () => {
    expect(resolvePaymentIntegrationMode({ NODE_ENV: 'test' })).toBe(
      'disabled',
    );
    expect(resolvePaymentIntegrationMode({ NODE_ENV: 'production' })).toBe(
      'disabled',
    );
  });

  it('allows tests to opt into the mock adapter explicitly', () => {
    expect(
      resolvePaymentIntegrationMode({
        NODE_ENV: 'test',
        BILLING_PAYMENT_MODE: 'mock',
      }),
    ).toBe('mock');
  });

  it('rejects mock payments in production and unknown modes', () => {
    expect(() =>
      resolvePaymentIntegrationMode({
        NODE_ENV: 'production',
        BILLING_PAYMENT_MODE: 'mock',
      }),
    ).toThrow('mock billing payments are forbidden in production');
    expect(() =>
      resolvePaymentIntegrationMode({
        NODE_ENV: 'development',
        BILLING_PAYMENT_MODE: 'real',
      }),
    ).toThrow('unsupported BILLING_PAYMENT_MODE');
  });
});
