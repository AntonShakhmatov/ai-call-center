import { Module } from '@nestjs/common';

/**
 * Tool layer. Tools are the only way agents interact with external systems
 * (business APIs, databases, telephony, reservations).
 *
 * Planned tool groups: menu, opening-hours, promotions, reservation, transfer.
 */
@Module({})
export class ToolsModule {}
