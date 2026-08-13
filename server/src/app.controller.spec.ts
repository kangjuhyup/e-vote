import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DATABASE_HEALTH_PORT,
  DatabaseHealthPort,
} from './application/port/database-health.port';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let databaseHealth: jest.Mocked<DatabaseHealthPort>;

  beforeEach(async () => {
    databaseHealth = {
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

    it('returns readiness when database is reachable', async () => {
      databaseHealth.ping.mockResolvedValue({ status: 'up' });

      await expect(appController.getReadiness()).resolves.toEqual({
        status: 'ok',
        checks: {
          database: 'up',
        },
      });
    });

    it('rejects readiness when database is not reachable', async () => {
      databaseHealth.ping.mockResolvedValue({
        status: 'down',
        reason: 'not_configured',
      });

      await expect(appController.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
