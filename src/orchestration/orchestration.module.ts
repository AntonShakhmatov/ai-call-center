import { Module } from '@nestjs/common';
import { ConversationStateService } from './conversation-state.service';
import { IntentRouterService } from './intent-router.service';
import { OrchestratorService } from './orchestrator.service';

@Module({
  providers: [OrchestratorService, ConversationStateService, IntentRouterService],
  exports: [OrchestratorService, ConversationStateService, IntentRouterService],
})
export class OrchestrationModule {}
