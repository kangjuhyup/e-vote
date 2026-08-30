import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { WasabiStorageHealthAdapter } from '../../../src/platform/storage/wasabi-storage-health.adapter';

type SendHeadBucketCommand = (command: HeadBucketCommand) => Promise<unknown>;

describe('WasabiStorageHealthAdapter', () => {
  it('returns up when Wasabi bucket is reachable', async () => {
    const send = jest.fn<SendHeadBucketCommand>().mockResolvedValue({});
    const adapter = new WasabiStorageHealthAdapter(
      createStorageHealthClient(send),
      'vote-files',
    );

    await expect(adapter.ping()).resolves.toEqual({ status: 'up' });

    const command = firstSentCommand(send);
    expect(command).toBeInstanceOf(HeadBucketCommand);
    expect(command.input).toEqual({
      Bucket: 'vote-files',
    });
  });

  it('returns down without leaking provider messages when Wasabi bucket is unreachable', async () => {
    const send = jest.fn<SendHeadBucketCommand>().mockRejectedValue({
      name: 'Forbidden',
      message: 'raw provider error',
    });
    const adapter = new WasabiStorageHealthAdapter(
      createStorageHealthClient(send),
      'vote-files',
    );

    await expect(adapter.ping()).resolves.toEqual({
      status: 'down',
      reason: 'Forbidden',
    });
  });
});

function createStorageHealthClient(
  send: jest.MockedFunction<SendHeadBucketCommand>,
): ConstructorParameters<typeof WasabiStorageHealthAdapter>[0] {
  return { send };
}

function firstSentCommand(
  send: jest.MockedFunction<SendHeadBucketCommand>,
): HeadBucketCommand {
  const calls = send.mock.calls as [HeadBucketCommand][];
  const firstCall = calls[0];

  if (!firstCall) {
    throw new Error('expected storage health client to receive a command');
  }

  return firstCall[0];
}
