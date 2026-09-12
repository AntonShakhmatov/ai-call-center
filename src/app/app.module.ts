import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { CacheModule } from 'src/cache/cache.module';
import { CallsModule } from 'src/calls/calls.module';
import { CommonModule } from 'src/common/common.module';
import { DatabaseModule } from 'src/database/database.module';
import { KnowledgeModule } from 'src/knowledge/knowledge.module';
import { OperatorsModule } from 'src/operators/operators.module';
import { OrchestrationModule } from 'src/orchestration/orchestration.module';
import { ToolsModule } from 'src/tools/tools.module';
import { VoiceModule } from 'src/voice/voice.module';
import { AgentsModule } from 'src/agents/agents.module';
import { validate } from 'src/config/config.validation';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    CommonModule,
    DatabaseModule,
    CacheModule,
    CallsModule,
    VoiceModule,
    AgentsModule,
    OrchestrationModule,
    ToolsModule,
    KnowledgeModule,
    OperatorsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
