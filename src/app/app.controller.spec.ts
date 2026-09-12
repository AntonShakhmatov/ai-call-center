import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from 'src/cache/cache.module';
import { AppController } from './app.controller';
import { CommonModule } from 'src/common/common.module';
import { DatabaseModule } from 'src/database/database.module';
import { validate } from 'src/config/config.validation';

describe('AppController', () => {
  let moduleRef: TestingModule;
  let appController: AppController;
  let configService: ConfigService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate,
        }),
        CommonModule,
        DatabaseModule,
        CacheModule,
      ],
      controllers: [AppController],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  it('GET /health should return ok status', () => {
    const result = appController.health();
    expect(result.status).toBe('ok');
    expect(result.environment).toBe(configService.get<string>('NODE_ENV'));
  });
});
