import { Injectable } from '@nestjs/common';
import { Agent, Intent } from 'src/domain/types';
import { RouteDecision } from './orchestration.types';

/**
 * Routes a recognized intent to the right agent, tool or a human operator.
 *
 * The registry of available agents is intentionally empty for the
 * foundation stage. Specialized agents (conversation, faq, reservation,
 * support) will register themselves here as they are implemented.
 */
@Injectable()
export class IntentRouterService {
  private readonly agents: Agent[] = [];

  /**
   * Register a specialized agent so it can be routed to.
   * Called by agents/ modules when they are implemented.
   */
  registerAgent(agent: Agent): void {
    this.agents.push(agent);
  }

  route(intent: Intent): RouteDecision {
    const agent = this.agents.find((candidate) => candidate.supportedIntents.includes(intent.name));

    if (agent) {
      return { agent, action: 'ROUTE_TO_AGENT' };
    }

    return { action: 'NO_AGENT' };
  }
}
