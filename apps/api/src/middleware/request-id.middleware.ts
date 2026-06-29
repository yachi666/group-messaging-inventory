import { randomUUID } from 'node:crypto';

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;

type HeaderValue = string | string[] | undefined;

type RequestWithRequestId = {
  headers: Record<string, HeaderValue>;
  requestId?: string;
};

type ResponseWithHeader = {
  setHeader: (name: string, value: string) => void;
};

export function requestIdMiddleware(
  request: RequestWithRequestId,
  response: ResponseWithHeader,
  next: () => void,
) {
  const inboundRequestId = normalizeHeaderValue(request.headers['x-request-id']);
  const requestId = inboundRequestId ?? randomUUID();

  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}

function normalizeHeaderValue(value: HeaderValue) {
  const headerValue = Array.isArray(value) ? value[0] : value;
  if (!headerValue || !requestIdPattern.test(headerValue)) {
    return null;
  }
  return headerValue;
}
