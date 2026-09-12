export interface CallRecord {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'TRANSFERRED';
  callerNumber?: string;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  callId: string;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'AGENT' | 'SYSTEM';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ConversationStateType {
  IDLE = 'IDLE',
  GREETING = 'GREETING',
  INTENT_RECOGNITION = 'INTENT_RECOGNITION',
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  RESPONSE = 'RESPONSE',
  TRANSFER = 'TRANSFER',
  ENDED = 'ENDED',
}

export interface ConversationState {
  conversationId: string;
  type: ConversationStateType;
  intent?: Intent;
  pendingTool?: Tool;
  transferRequested: boolean;
  metadata: Record<string, unknown>;
}

export interface Intent {
  name: string;
  confidence: number;
  entities: Record<string, unknown>;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  supportedIntents: string[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface OperatorTransfer {
  conversationId: string;
  callId: string;
  reason?: string;
  requestedAt: Date;
}
