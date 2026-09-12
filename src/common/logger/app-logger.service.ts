import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';

/**
 * Reusable application logger.
 *
 * Use instead of bare `console.log` so log output stays consistent and
 * can be routed/extended later (JSON, request context, remote sinks).
 *
 * Available methods: log(), warn(), error(), debug().
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger extends ConsoleLogger {
  constructor(context?: string) {
    super(context ?? AppLogger.name);
  }
}
