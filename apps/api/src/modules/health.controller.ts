import { Controller, Get, Header, Inject } from '@nestjs/common';
import { HealthService } from './health.service.js';
import { MetricsService } from './metrics.service.js';

@Controller()
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
    @Inject(MetricsService) private readonly metricsService: MetricsService,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'group-messaging-inventory-api',
    };
  }

  @Get('ready')
  getReadiness() {
    return this.healthService.getReadiness();
  }

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics() {
    return this.metricsService.getPrometheusMetrics();
  }
}
