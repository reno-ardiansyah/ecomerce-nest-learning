import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((result) => {
        // Extract data and any controller-provided meta or total
        let data: any;
        let controllerMeta: Record<string, any> | undefined;
        let controllerTotal: number | undefined;

        if (result && typeof result === 'object') {
          if ('meta' in result && 'data' in result) {
            controllerMeta = (result as any).meta;
            data = (result as any).data;
          } else if ('data' in result && 'total' in result) {
            controllerTotal = (result as any).total;
            data = (result as any).data;
          } else {
            data = result;
          }
        } else {
          data = result;
        }

        let autoMeta: Record<string, any> | undefined;
        if (!controllerMeta && Array.isArray(data)) {
          const count = data.length;
          const offset = Number(request.query.skip) || 0;
          const limit = Number(request.query.take) || 10;
          const total = controllerTotal !== undefined ? controllerTotal : undefined;

          const pages = total !== undefined && limit > 0
            ? Math.ceil(total / limit)
            : undefined;
          const current = limit > 0
            ? Math.floor(offset / limit) + 1
            : undefined;
          const nextPage = pages !== undefined && current !== undefined && current < pages
            ? current + 1
            : null;

          autoMeta = { count, offset, limit };
          if (total !== undefined) autoMeta.total = total;
          if (current !== undefined) autoMeta.current = current;
          if (nextPage !== null) autoMeta.nextPage = nextPage;
        }

        const finalMeta = controllerMeta ?? autoMeta;

        return {
          status: response.statusCode,
          message: response.statusCode >= 400 ? 'Error' : 'Success',
          error: response.statusCode >= 400 ? response.statusMessage : null,
          timestamp: new Date().toISOString(),
          version: 'v0',
          path: request.url,
          data,
          ...(finalMeta && { meta: finalMeta }),
        };
      }),
      catchError((err) => {
        const statusCode = err instanceof HttpException ? err.getStatus() : 500;
        const errorResponse: any = {
          status: statusCode,
          message: err.message || 'Internal server error',
          error: err instanceof HttpException
            ? ((err.getResponse() as any).message || err.name)
            : err.name,
          timestamp: new Date().toISOString(),
          version: 'v0',
          path: request.url,
          data: {},
        };
        return throwError(() => new HttpException(errorResponse, statusCode));
      }),
    );
  }
}
