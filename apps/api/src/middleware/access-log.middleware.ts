type RequestWithRequestId = {
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
        method: request.method ?? 'UNKNOWN',
        path: request.originalUrl ?? request.url ?? 'unknown',
        statusCode: response.statusCode ?? 0,
        durationMs,
      }),
    );
  });

  next();
}
