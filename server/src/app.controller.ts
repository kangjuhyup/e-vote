import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

type LivenessResponse = {
  status: 'ok';
};

type ReadinessResponse = {
  status: 'ok';
  checks: {
    database: 'up';
  };
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('liveness')
  getLiveness(): LivenessResponse {
    return this.appService.getLiveness();
  }

  @Get('readiness')
  getReadiness(): Promise<ReadinessResponse> {
    return this.appService.getReadiness();
  }
}
