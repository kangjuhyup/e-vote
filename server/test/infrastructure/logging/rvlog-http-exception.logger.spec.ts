import { Logger } from '@kangjuhyup/rvlog';
import { RvlogHttpExceptionLogger } from '../../../src/platform/logging/rvlog-http-exception.logger';

describe('RvlogHttpExceptionLogger', () => {
  afterEach(() => {
    Logger.resetForTesting();
    jest.restoreAllMocks();
  });

  it('prints the sanitized Error stack for a 5XX failure', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    Logger.configure({ pretty: true });
    const logger = new RvlogHttpExceptionLogger();
    const error = new Error('Internal server error');
    error.stack = [
      'Error: Internal server error',
      '    at persistVote (/srv/vote.handler.ts:42:7)',
    ].join('\n');

    logger.error('POST /votes failed 500', error);

    const output = errorSpy.mock.calls.flat().join(' ');
    expect(output).toContain('POST /votes failed 500');
    expect(output).toContain('at persistVote (/srv/vote.handler.ts:42:7)');
  });
});
