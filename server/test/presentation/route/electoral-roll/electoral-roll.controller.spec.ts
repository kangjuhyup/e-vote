import { TEST_USER_PRINCIPAL } from '../../user-principal.fixture';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ElectoralRollNotFoundError } from '../../../../src/modules/electoral-roll/application/command/electoral-roll.error';
import type { AddElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/add-electoral-roll-member.handler';
import type { CreateElectoralRollHandler } from '../../../../src/modules/electoral-roll/application/command/handler/create-electoral-roll.handler';
import type { RemoveElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/remove-electoral-roll-member.handler';
import type { UpdateElectoralRollMemberHandler } from '../../../../src/modules/electoral-roll/application/command/handler/update-electoral-roll-member.handler';
import type { GetElectoralRollHandler } from '../../../../src/modules/electoral-roll/application/query/handler/get-electoral-roll.handler';
import type { GetElectoralRollPageHandler } from '../../../../src/modules/electoral-roll/application/query/handler/get-electoral-roll-page.handler';
import {
  ElectoralRollPageItemView,
  ElectoralRollPageView,
  ElectoralRollView,
} from '../../../../src/modules/electoral-roll/application/query/dto/response/electoral-roll.view';
import { ElectoralRollController } from '../../../../src/modules/electoral-roll/presentation/electoral-roll/electoral-roll.controller';
import { ElectoralRollReadController } from '../../../../src/modules/electoral-roll/presentation/electoral-roll/electoral-roll-read.controller';
import { throwMappedElectoralRollError } from '../../../../src/modules/electoral-roll/presentation/electoral-roll/electoral-roll-error.mapper';

describe('electoral roll controllers', () => {
  it('maps source-roll creation to its command handler', async () => {
    const createRoll = handler({
      id: 'roll-1',
      commissionId: 'commission-1',
      name: 'Members',
      revision: 1,
    });
    const controller = new ElectoralRollController(
      createRoll as unknown as CreateElectoralRollHandler,
      handler() as unknown as AddElectoralRollMemberHandler,
      handler() as unknown as UpdateElectoralRollMemberHandler,
      handler() as unknown as RemoveElectoralRollMemberHandler,
    );

    await expect(
      controller.createElectoralRoll(TEST_USER_PRINCIPAL, {
        commissionId: 'commission-1',
        name: 'Members',
      }),
    ).resolves.toMatchObject({ id: 'roll-1', revision: 1 });
  });

  it('maps a missing source roll to HTTP 404', async () => {
    const getHandler = {
      execute: jest.fn().mockRejectedValue(new ElectoralRollNotFoundError()),
    } as unknown as GetElectoralRollHandler;

    await expect(
      new ElectoralRollReadController(
        getHandler,
        handler() as unknown as GetElectoralRollPageHandler,
      ).getElectoralRoll(TEST_USER_PRINCIPAL, {
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
        handler() as unknown as GetElectoralRollPageHandler,
      ).getElectoralRoll(TEST_USER_PRINCIPAL, {
        electoralRollId: 'roll-1',
      }),
    ).resolves.toMatchObject({
      id: 'roll-1',
      revision: 2,
      createdAt: '2026-08-30T00:00:00.000Z',
      updatedAt: '2026-08-30T01:00:00.000Z',
    });
  });

  it('maps GET /electoral-rolls to an authorized metadata-only page', async () => {
    const page = ElectoralRollPageView.of({
      items: [
        ElectoralRollPageItemView.of({
          id: 'roll-1',
          name: '2026 상반기 선거인명부',
          commissionId: 'commission-1',
          revision: 2,
          memberCount: 120,
          updatedAt: new Date('2026-08-30T10:00:00.000Z'),
        }),
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    const pageHandler = handler(page);

    const response = await new ElectoralRollReadController(
      handler() as unknown as GetElectoralRollHandler,
      pageHandler as unknown as GetElectoralRollPageHandler,
    ).getElectoralRollPage(TEST_USER_PRINCIPAL, {
      commissionId: 'commission-1',
      q: '상반기',
      page: '1',
      pageSize: '20',
    });

    expect(pageHandler.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrincipalId: TEST_USER_PRINCIPAL.id,
        commissionId: 'commission-1',
        query: '상반기',
        page: 1,
        pageSize: 20,
      }),
    );
    expect(response).toEqual({
      items: [
        {
          id: 'roll-1',
          name: '2026 상반기 선거인명부',
          commissionId: 'commission-1',
          revision: 2,
          memberCount: 120,
          updatedAt: '2026-08-30T10:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
    expect(response.items[0]).not.toHaveProperty('members');
  });
});

function handler(result?: unknown) {
  return { execute: jest.fn().mockResolvedValue(result) };
}
