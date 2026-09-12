import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from 'src/common/logger/app-logger.service';

@Controller()
export class AppController {
  private readonly logger = new AppLogger(AppController.name);

  constructor(private readonly configService: ConfigService) {}

  @Get('health')
  health() {
    this.logger.debug('Health check requested');
    return {
      status: 'ok',
      environment: this.configService.get<string>('NODE_ENV'),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
