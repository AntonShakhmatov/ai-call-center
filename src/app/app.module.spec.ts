import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { CallsService } from 'src/calls/calls.service';
import { OrchestratorService } from 'src/orchestration/orchestrator.service';
import { VoiceGateway } from 'src/voice/voice.gateway';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { RedisService } from 'src/cache/redis/redis.service';
import { AppLogger } from 'src/common/logger/app-logger.service';

describe('AppModule', () => {
  it('should instantiate the application with all core modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef.get(CallsService)).toBeDefined();
    expect(moduleRef.get(OrchestratorService)).toBeDefined();
    expect(moduleRef.get(VoiceGateway)).toBeDefined();
    expect(moduleRef.get(PrismaService)).toBeDefined();
    expect(moduleRef.get(RedisService)).toBeDefined();
    await expect(moduleRef.resolve(AppLogger)).resolves.toBeDefined();

    await moduleRef.close();
  });
});
