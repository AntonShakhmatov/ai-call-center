import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new AppLogger();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();

    const startedAt = Date.now();
    this.logger.log(`Request started: ${request.method} ${request.url}`, 'HTTP');

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          this.logger.log(
            `Request finished: ${request.method} ${request.url} in ${duration}ms`,
            'HTTP',
          );
        },
        error: (error: { status?: number }) => {
          const duration = Date.now() - startedAt;
          this.logger.warn(
            `Request failed: ${request.method} ${request.url} status=${error?.status ?? 'unknown'} in ${duration}ms`,
            'HTTP',
          );
        },
      }),
    );
  }
}
