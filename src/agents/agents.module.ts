import { Module } from '@nestjs/common';

/**
 * Aggregates all specialized agents (conversation, faq, reservation, support).
 *
 * Agents will be implemented here without direct database access; they will
 * reach external systems exclusively through tools. Each agent registers
 * itself with the intent router when it is implemented.
 */
@Module({})
export class AgentsModule {}
