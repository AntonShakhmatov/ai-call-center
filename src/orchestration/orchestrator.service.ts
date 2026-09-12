import { Injectable } from '@nestjs/common';
import { Intent, Tool, ToolResult } from 'src/domain/types';
import { AppLogger } from 'src/common/logger/app-logger.service';
import { ConversationStateService } from './conversation-state.service';
import { IntentRouterService } from './intent-router.service';
import { OrchestrationResult } from './orchestration.types';

/**
 * Central control point for a conversation.
 *
 * Owns the conversation lifecycle: it maintains state, routes intents to
 * agents/tools/operators and will later translate agent responses into the
 * realtime voice layer.
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new AppLogger(OrchestratorService.name);

  constructor(
    private readonly conversationState: ConversationStateService,
    private readonly intentRouter: IntentRouterService,
  ) {}

  startConversation(conversationId: string): OrchestrationResult {
    const state = this.conversationState.getOrCreate(conversationId);
    this.logger.debug(`Conversation ${conversationId} started (state=${state.type})`);
    return { decision: { action: 'NO_AGENT' } };
  }

  handleIntent(conversationId: string, intent: Intent): OrchestrationResult {
    this.conversationState.update(conversationId, { intent });
    const decision = this.intentRouter.route(intent);
    return { decision };
  }

  handleToolResult(_conversationId: string, _tool: Tool, _result: ToolResult): OrchestrationResult {
    return { decision: { action: 'NO_AGENT' } };
  }

  endConversation(conversationId: string): void {
    this.conversationState.delete(conversationId);
    this.logger.debug(`Conversation ${conversationId} ended`);
  }
}
