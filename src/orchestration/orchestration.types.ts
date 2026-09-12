import { Agent } from 'src/domain/types';

export interface RouteDecision {
  agent?: Agent;
  action: 'ROUTE_TO_AGENT' | 'EXECUTE_TOOL' | 'TRANSFER_TO_OPERATOR' | 'NO_AGENT';
  toolName?: string;
}

export interface OrchestrationResult {
  decision: RouteDecision;
  reply?: string;
}
