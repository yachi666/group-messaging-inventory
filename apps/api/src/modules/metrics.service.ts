import { Injectable } from '@nestjs/common';

export type HttpRequestMetric = {
  method: string;
  statusCode: number;
  durationMs: number;
};

type HttpMetricBucket = {
  count: number;
  durationMsSum: number;
};

class HttpMetricsRegistry {
  private readonly buckets = new Map<string, HttpMetricBucket>();

  record(metric: HttpRequestMetric) {
    const method = sanitizeLabel(metric.method.toUpperCase() || 'UNKNOWN');
    const statusClass = toStatusClass(metric.statusCode);
    const key = `${method}:${statusClass}`;
    const bucket = this.buckets.get(key) ?? {
      count: 0,
      durationMsSum: 0,
    };

    bucket.count += 1;
    bucket.durationMsSum += Math.max(0, metric.durationMs);
    this.buckets.set(key, bucket);
  }

  reset() {
    this.buckets.clear();
  }

  toPrometheusText() {
    const lines = [
      '# HELP gmi_api_http_requests_total Total HTTP requests handled by the API.',
      '# TYPE gmi_api_http_requests_total counter',
    ];

    for (const [key, bucket] of this.sortedBuckets()) {
      const { method, statusClass } = parseKey(key);
      lines.push(
        `gmi_api_http_requests_total{method="${method}",status_class="${statusClass}"} ${bucket.count}`,
      );
    }

    lines.push(
      '# HELP gmi_api_http_request_duration_seconds_sum Total HTTP request duration in seconds.',
      '# TYPE gmi_api_http_request_duration_seconds_sum counter',
    );

    for (const [key, bucket] of this.sortedBuckets()) {
      const { method, statusClass } = parseKey(key);
      lines.push(
        `gmi_api_http_request_duration_seconds_sum{method="${method}",status_class="${statusClass}"} ${(bucket.durationMsSum / 1000).toFixed(6)}`,
      );
    }

    lines.push(
      '# HELP gmi_api_http_request_duration_seconds_count Count of HTTP request duration observations.',
      '# TYPE gmi_api_http_request_duration_seconds_count counter',
    );

    for (const [key, bucket] of this.sortedBuckets()) {
      const { method, statusClass } = parseKey(key);
      lines.push(
        `gmi_api_http_request_duration_seconds_count{method="${method}",status_class="${statusClass}"} ${bucket.count}`,
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private sortedBuckets() {
    return [...this.buckets.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }
}

export const httpMetricsRegistry = new HttpMetricsRegistry();

@Injectable()
export class MetricsService {
  getPrometheusMetrics() {
    return httpMetricsRegistry.toPrometheusText();
  }
}

function toStatusClass(statusCode: number) {
  if (statusCode >= 100 && statusCode < 600) {
    return `${Math.floor(statusCode / 100)}xx`;
  }

  return 'unknown';
}

function sanitizeLabel(value: string) {
  return value.replace(/[^A-Z0-9_:-]/g, '_');
}

function parseKey(key: string) {
  const [method = 'UNKNOWN', statusClass = 'unknown'] = key.split(':');
  return {
    method,
    statusClass,
  };
}
