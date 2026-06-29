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
    console.log(
      JSON.stringify({
        event: 'http_request',
        requestId: request.requestId ?? 'unknown',
        actorId: normalizeHeaderValue(request.headers?.['x-actor-id']) ?? 'anonymous',
        roleCount: parseHeaderList(request.headers?.['x-gmi-roles']).size,
        method: request.method ?? 'UNKNOWN',
        path: request.originalUrl ?? request.url ?? 'unknown',
        statusCode: response.statusCode ?? 0,
        durationMs,
      }),
    );
  });

  next();
}

function normalizeHeaderValue(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const trimmed = rawValue?.trim();
  return trimmed ? trimmed : undefined;
}

function parseHeaderList(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value.join(',') : value ?? '';
  return new Set(
    rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}
