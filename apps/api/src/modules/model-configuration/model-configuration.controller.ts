import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { validateModelConfigurationSchema } from '@gmi/contracts';
import { RequiresRoles } from '../../auth/governance-auth.guard.js';
import { ModelConfigurationService } from './model-configuration.service.js';

@Controller('model-configuration')
export class ModelConfigurationController {
  constructor(
    @Inject(ModelConfigurationService)
    private readonly modelConfiguration: ModelConfigurationService,
  ) {}

  @Get('runtime')
  @RequiresRoles('analysis_reader', 'auditor')
  getRuntimeConfiguration() {
    return this.modelConfiguration.getRuntimeConfiguration();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @RequiresRoles('change_checker', 'auditor')
  validateConfiguration(@Body() body: unknown) {
    const request = validateModelConfigurationSchema.parse(body);
    return this.modelConfiguration.validateConfiguration(request);
  }
}
