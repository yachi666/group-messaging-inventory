import { resolveGovernanceAuthContext } from '../auth/governance-auth-context.js';
import { httpMetricsRegistry } from '../modules/metrics.service.js';

type RequestWithRequestId = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  requestId?: string;
  url?: string;
};

type ResponseWithFinish = {
  on: (event: 'finish', listener: () => void) => void;
  statusCode?: number;
};

export function accessLogMiddleware(
  request: RequestWithRequestId,
  response: ResponseWithFinish,
  next: () => void,
) {
  const startedAt = performance.now();

  response.on('finish', () => {
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const authContext = resolveGovernanceAuthContext(request.headers);
    const statusCode = response.statusCode ?? 0;

    httpMetricsRegistry.record({
      method: request.method ?? 'UNKNOWN',
      statusCode,
      durationMs,
    });

    console.log(
      JSON.stringify({
        event: 'http_request',
        requestId: request.requestId ?? 'unknown',
        actorId: authContext.actorId ?? 'anonymous',
        roleCount: authContext.roles.size,
        method: request.method ?? 'UNKNOWN',
        path: request.originalUrl ?? request.url ?? 'unknown',
        statusCode,
        durationMs,
      }),
    );
  });

  next();
}
