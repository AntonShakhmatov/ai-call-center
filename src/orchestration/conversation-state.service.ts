import { Injectable } from '@nestjs/common';
import { ConversationState, ConversationStateType } from 'src/domain/types';
import { AppLogger } from 'src/common/logger/app-logger.service';

/**
 * Holds the state of every active conversation.
 *
 * Currently backed by an in-memory Map for the foundation stage.
 * Active/session state will move to Redis in a later step so that
 * state survives process restarts and can be shared across replicas.
 */
@Injectable()
export class ConversationStateService {
  private readonly logger = new AppLogger(ConversationStateService.name);
  private readonly states = new Map<string, ConversationState>();

  getOrCreate(conversationId: string): ConversationState {
    const existing = this.states.get(conversationId);
    if (existing) {
      return existing;
    }

    const state: ConversationState = {
      conversationId,
      type: ConversationStateType.IDLE,
      transferRequested: false,
      metadata: {},
    };

    this.states.set(conversationId, state);
    this.logger.debug(`Created state for conversation ${conversationId}`);
    return state;
  }

  get(conversationId: string): ConversationState | undefined {
    return this.states.get(conversationId);
  }

  update(conversationId: string, partial: Partial<ConversationState>): ConversationState {
    const state = this.getOrCreate(conversationId);
    Object.assign(state, partial);
    this.states.set(conversationId, state);
    return state;
  }

  delete(conversationId: string): void {
    this.states.delete(conversationId);
    this.logger.debug(`State discarded for conversation ${conversationId}`);
  }
}
