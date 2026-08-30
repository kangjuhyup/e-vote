import { ConflictException, NotFoundException } from '@nestjs/common';
import { ElectoralRollNotFoundError } from '../../../../src/application/command/electoral-roll.error';
import type { AddElectoralRollMemberHandler } from '../../../../src/application/command/handler/add-electoral-roll-member.handler';
import type { CreateElectoralRollHandler } from '../../../../src/application/command/handler/create-electoral-roll.handler';
import type { CreateElectoralRollSnapshotHandler } from '../../../../src/application/command/handler/create-electoral-roll-snapshot.handler';
import type { RemoveElectoralRollMemberHandler } from '../../../../src/application/command/handler/remove-electoral-roll-member.handler';
import type { UpdateElectoralRollMemberHandler } from '../../../../src/application/command/handler/update-electoral-roll-member.handler';
import type { GetElectoralRollHandler } from '../../../../src/application/query/handler/get-electoral-roll.handler';
import { ElectoralRollView } from '../../../../src/application/query/dto/response/electoral-roll.view';
import { ElectoralRollController } from '../../../../src/presentation/route/electoral-roll/electoral-roll.controller';
import { ElectoralRollReadController } from '../../../../src/presentation/route/electoral-roll/electoral-roll-read.controller';
import { throwMappedElectoralRollError } from '../../../../src/presentation/route/electoral-roll/electoral-roll-error.mapper';

describe('electoral roll controllers', () => {
  it('maps source-roll creation and snapshot creation to command handlers', async () => {
    const createRoll = handler({
      id: 'roll-1',
      commissionId: 'commission-1',
      name: 'Members',
      revision: 1,
    });
    const createSnapshot = handler({
      id: 'snapshot-1',
      electoralRollId: 'roll-1',
      sourceRevision: 1,
      memberCount: 0,
      contentHash: 'a'.repeat(64),
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    });
    const controller = new ElectoralRollController(
      createRoll as unknown as CreateElectoralRollHandler,
      handler() as unknown as AddElectoralRollMemberHandler,
      handler() as unknown as UpdateElectoralRollMemberHandler,
      handler() as unknown as RemoveElectoralRollMemberHandler,
      createSnapshot as unknown as CreateElectoralRollSnapshotHandler,
    );

    await expect(
      controller.createElectoralRoll({
        commissionId: 'commission-1',
        name: 'Members',
      }),
    ).resolves.toMatchObject({ id: 'roll-1', revision: 1 });
    await expect(
      controller.createSnapshot({ electoralRollId: 'roll-1' }),
    ).resolves.toMatchObject({
      id: 'snapshot-1',
      sourceRevision: 1,
      createdAt: '2026-08-30T00:00:00.000Z',
    });
  });

  it('maps a missing source roll to HTTP 404', async () => {
    const getHandler = {
      execute: jest.fn().mockRejectedValue(new ElectoralRollNotFoundError()),
    } as unknown as GetElectoralRollHandler;

    await expect(
      new ElectoralRollReadController(getHandler).getElectoralRoll({
        electoralRollId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps duplicate member identifiers to HTTP 409', () => {
    expect(() =>
      throwMappedElectoralRollError({
        name: 'UniqueConstraintViolationException',
        message: 'duplicate member identifier',
      }),
    ).toThrow(ConflictException);
  });

  it('maps a roll view to an ISO-timestamped response', async () => {
    const view = ElectoralRollView.of({
      id: 'roll-1',
      commissionId: 'commission-1',
      name: 'Members',
      revision: 2,
      members: [],
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      updatedAt: new Date('2026-08-30T01:00:00.000Z'),
    });

    await expect(
      new ElectoralRollReadController(
        handler(view) as unknown as GetElectoralRollHandler,
      ).getElectoralRoll({ electoralRollId: 'roll-1' }),
    ).resolves.toMatchObject({
      id: 'roll-1',
      revision: 2,
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T01:00:00.000Z',
    });
  });
});

function handler(result?: unknown) {
  return { execute: jest.fn().mockResolvedValue(result) };
}
