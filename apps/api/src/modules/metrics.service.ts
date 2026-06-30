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

type CounterBucket = {
  count: number;
};

type AnalysisRunSubmittedMetric = {
  triggerType: string;
  effort: string;
  workflowDriver: string;
};

type AnalysisRunConfirmedMetric = {
  reviewStatus: string;
};

type ReleaseEvidenceRecordedMetric = {
  verdict: string;
  status: string;
  promotionAllowed: boolean;
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

class DomainMetricsRegistry {
  private readonly analysisRunSubmittedBuckets = new Map<string, CounterBucket>();
  private readonly analysisRunConfirmedBuckets = new Map<string, CounterBucket>();
  private readonly releaseEvidenceRecordedBuckets = new Map<string, CounterBucket>();

  recordAnalysisRunSubmitted(metric: AnalysisRunSubmittedMetric) {
    incrementCounter(this.analysisRunSubmittedBuckets, [
      sanitizeLabel(metric.triggerType),
      sanitizeLabel(metric.effort),
      sanitizeLabel(metric.workflowDriver),
    ]);
  }

  recordAnalysisRunConfirmed(metric: AnalysisRunConfirmedMetric) {
    incrementCounter(this.analysisRunConfirmedBuckets, [
      sanitizeLabel(metric.reviewStatus),
    ]);
  }

  recordReleaseEvidenceRecorded(metric: ReleaseEvidenceRecordedMetric) {
    incrementCounter(this.releaseEvidenceRecordedBuckets, [
      sanitizeLabel(metric.verdict),
      sanitizeLabel(metric.status),
      metric.promotionAllowed ? 'true' : 'false',
    ]);
  }

  reset() {
    this.analysisRunSubmittedBuckets.clear();
    this.analysisRunConfirmedBuckets.clear();
    this.releaseEvidenceRecordedBuckets.clear();
  }

  toPrometheusText() {
    const lines = [
      '# HELP gmi_analysis_runs_submitted_total Total analysis runs accepted by trigger, effort, and workflow driver.',
      '# TYPE gmi_analysis_runs_submitted_total counter',
      ...formatCounterBuckets(
        this.analysisRunSubmittedBuckets,
        'gmi_analysis_runs_submitted_total',
        ['trigger_type', 'effort', 'workflow_driver'],
      ),
      '# HELP gmi_analysis_runs_confirmed_total Total analysis run confirmations by review status.',
      '# TYPE gmi_analysis_runs_confirmed_total counter',
      ...formatCounterBuckets(
        this.analysisRunConfirmedBuckets,
        'gmi_analysis_runs_confirmed_total',
        ['review_status'],
      ),
      '# HELP gmi_release_evidence_records_total Total release evidence records accepted by verdict, status, and promotion flag.',
      '# TYPE gmi_release_evidence_records_total counter',
      ...formatCounterBuckets(
        this.releaseEvidenceRecordedBuckets,
        'gmi_release_evidence_records_total',
        ['verdict', 'status', 'promotion_allowed'],
      ),
    ];

    return `${lines.join('\n')}\n`;
  }
}

export const domainMetricsRegistry = new DomainMetricsRegistry();

@Injectable()
export class MetricsService {
  getPrometheusMetrics() {
    return `${httpMetricsRegistry.toPrometheusText()}${domainMetricsRegistry.toPrometheusText()}`;
  }
}

function toStatusClass(statusCode: number) {
  if (statusCode >= 100 && statusCode < 600) {
    return `${Math.floor(statusCode / 100)}xx`;
  }

  return 'unknown';
}

function sanitizeLabel(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

function parseKey(key: string) {
  const [method = 'UNKNOWN', statusClass = 'unknown'] = key.split(':');
  return {
    method,
    statusClass,
  };
}

function incrementCounter(buckets: Map<string, CounterBucket>, labelValues: string[]) {
  const key = labelValues.join(':');
  const bucket = buckets.get(key) ?? {
    count: 0,
  };

  bucket.count += 1;
  buckets.set(key, bucket);
}

function formatCounterBuckets(
  buckets: Map<string, CounterBucket>,
  metricName: string,
  labelNames: string[],
) {
  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, bucket]) => {
      const labelValues = key.split(':');
      const labels = labelNames
        .map((labelName, index) => `${labelName}="${labelValues[index] ?? 'unknown'}"`)
        .join(',');

      return `${metricName}{${labels}} ${bucket.count}`;
    });
}
