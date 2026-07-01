import { resolveGovernanceAuthContext } from '../auth/governance-auth-context.js';

export type RateLimitOptions = {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
};

type HeaderValue = string | string[] | undefined;

type RequestWithRateLimit = {
  headers?: Record<string, HeaderValue>;
  method?: string;
  originalUrl?: string;
  requestId?: string;
  socket?: {
    remoteAddress?: string;
  };
  url?: string;
};

type ResponseWithRateLimit = {
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const operationalPaths = new Set(['/health', '/ready', '/metrics']);

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const buckets = new Map<string, RateLimitBucket>();

  return (
    request: RequestWithRateLimit,
    response: ResponseWithRateLimit,
    next: () => void,
  ) => {
    if (!options.enabled || shouldSkipRateLimit(request)) {
      next();
      return;
    }

    const now = Date.now();
    const routeGroup = getRouteGroup(request);
    const key = `${routeGroup}:${getCallerIdentity(request)}`;
    const existing = buckets.get(key);
    const bucket =
      existing && existing.resetAt > now
        ? existing
        : {
            count: 0,
            resetAt: now + options.windowMs,
          };

    bucket.count += 1;
    buckets.set(key, bucket);
    purgeExpiredBuckets(buckets, now);

    const remaining = Math.max(options.maxRequests - bucket.count, 0);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    response.setHeader('x-rate-limit-limit', String(options.maxRequests));
    response.setHeader('x-rate-limit-remaining', String(remaining));
    response.setHeader('x-rate-limit-reset', new Date(bucket.resetAt).toISOString());

    if (bucket.count <= options.maxRequests) {
      next();
      return;
    }

    response.setHeader('retry-after', String(retryAfterSeconds));
    response.status(429).json({
      error: {
        requestId: request.requestId ?? 'unknown',
        code: 'rate_limited',
        message: 'API rate limit exceeded. Retry after the advertised window.',
        details: {
          routeGroup,
          limit: options.maxRequests,
          windowMs: options.windowMs,
          retryAfterSeconds,
        },
      },
    });
  };
}

function shouldSkipRateLimit(request: RequestWithRateLimit) {
  if (request.method === 'OPTIONS') {
    return true;
  }

  const pathname = getPathname(request);
  return operationalPaths.has(pathname);
}

function getRouteGroup(request: RequestWithRateLimit) {
  const pathname = getPathname(request);

  if (pathname.startsWith('/template-versions/')) {
    return 'analysis-runs';
  }

  if (pathname.startsWith('/change-requests/') || pathname.includes('change-requests')) {
    return 'change-requests';
  }

  if (pathname.startsWith('/review-tasks/')) {
    return 'review-tasks';
  }

  if (pathname.startsWith('/model-configuration/')) {
    return 'model-configuration';
  }

  return `${request.method ?? 'UNKNOWN'}:${pathname}`;
}

function getCallerIdentity(request: RequestWithRateLimit) {
  const authContext = resolveGovernanceAuthContext(request.headers);

  if (authContext.actorId) {
    return `actor:${authContext.actorId}`;
  }

  const forwardedFor = normalizeHeaderValue(request.headers?.['x-forwarded-for']);
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0]?.trim() ?? 'unknown'}`;
  }

  return `ip:${request.socket?.remoteAddress ?? 'unknown'}`;
}

function getPathname(request: RequestWithRateLimit) {
  const rawUrl = request.originalUrl ?? request.url ?? '/';
  try {
    return new URL(rawUrl, 'http://local').pathname;
  } catch {
    return rawUrl.split('?')[0] ?? '/';
  }
}

function normalizeHeaderValue(value: HeaderValue) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const trimmed = rawValue?.trim();
  return trimmed ? trimmed : undefined;
}

function purgeExpiredBuckets(buckets: Map<string, RateLimitBucket>, now: number) {
  if (buckets.size < 1000) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
