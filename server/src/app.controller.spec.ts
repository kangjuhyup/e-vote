import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DATABASE_HEALTH_PORT,
  DatabaseHealthPort,
} from './application/port/database-health.port';
import {
  STORAGE_HEALTH_PORT,
  StorageHealthPort,
} from './application/port/storage-health.port';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let databaseHealth: jest.Mocked<DatabaseHealthPort>;
  let storageHealth: jest.Mocked<StorageHealthPort>;

  beforeEach(async () => {
    databaseHealth = {
      ping: jest.fn(),
    };
    storageHealth = {
      ping: jest.fn(),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DATABASE_HEALTH_PORT,
          useValue: databaseHealth,
        },
        {
          provide: STORAGE_HEALTH_PORT,
          useValue: storageHealth,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('returns liveness status', () => {
      expect(appController.getLiveness()).toEqual({ status: 'ok' });
    });

    it('returns readiness when database and storage are reachable', async () => {
      databaseHealth.ping.mockResolvedValue({ status: 'up' });
      storageHealth.ping.mockResolvedValue({ status: 'up' });

      await expect(appController.getReadiness()).resolves.toEqual({
        status: 'ok',
        checks: {
          database: 'up',
          storage: 'up',
        },
      });
    });

    it('rejects readiness when database is not reachable', async () => {
      databaseHealth.ping.mockResolvedValue({
        status: 'down',
        reason: 'not_configured',
      });
      storageHealth.ping.mockResolvedValue({ status: 'up' });

      await expect(appController.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('rejects readiness when storage is not reachable', async () => {
      databaseHealth.ping.mockResolvedValue({ status: 'up' });
      storageHealth.ping.mockResolvedValue({
        status: 'down',
        reason: 'not_configured',
      });

      await expect(appController.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
