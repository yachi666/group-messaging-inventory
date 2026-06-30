import { accessLogMiddleware } from '../apps/api/dist/middleware/access-log.middleware.js';
import {
  domainMetricsRegistry,
  httpMetricsRegistry,
  MetricsService,
} from '../apps/api/dist/modules/metrics.service.js';

httpMetricsRegistry.reset();
domainMetricsRegistry.reset();

emitRequestMetric({
  method: 'GET',
  originalUrl: '/health',
  statusCode: 200,
});
emitRequestMetric({
  method: 'POST',
  originalUrl: '/template-versions/tv-local/analysis-runs',
  statusCode: 202,
});
emitRequestMetric({
  method: 'POST',
  originalUrl: '/change-requests/cr-local/decision',
  statusCode: 403,
});
domainMetricsRegistry.recordAnalysisRunSubmitted({
  triggerType: 'manual_reanalysis',
  effort: 'normal',
  workflowDriver: 'temporal',
});
domainMetricsRegistry.recordAnalysisRunConfirmed({
  reviewStatus: 'reviewed',
});
domainMetricsRegistry.recordReleaseEvidenceRecorded({
  verdict: 'pass',
  status: 'ReadyForPromotion',
  promotionAllowed: true,
});

const metrics = new MetricsService().getPrometheusMetrics();

assertIncludes(metrics, '# TYPE gmi_api_http_requests_total counter', 'request counter type');
assertIncludes(
  metrics,
  'gmi_api_http_requests_total{method="GET",status_class="2xx"} 1',
  'GET 2xx request counter',
);
assertIncludes(
  metrics,
  'gmi_api_http_requests_total{method="POST",status_class="2xx"} 1',
  'POST 2xx request counter',
);
assertIncludes(
  metrics,
  'gmi_api_http_requests_total{method="POST",status_class="4xx"} 1',
  'POST 4xx request counter',
);
assertIncludes(
  metrics,
  'gmi_api_http_request_duration_seconds_sum{method="POST",status_class="4xx"}',
  'duration sum metric',
);
assertIncludes(
  metrics,
  'gmi_analysis_runs_submitted_total{trigger_type="manual_reanalysis",effort="normal",workflow_driver="temporal"} 1',
  'analysis run submitted metric',
);
assertIncludes(
  metrics,
  'gmi_analysis_runs_confirmed_total{review_status="reviewed"} 1',
  'analysis run confirmed metric',
);
assertIncludes(
  metrics,
  'gmi_release_evidence_records_total{verdict="pass",status="ReadyForPromotion",promotion_allowed="true"} 1',
  'release evidence recorded metric',
);
assertDoesNotInclude(metrics, 'tv-local', 'metrics must not expose high-cardinality ids');
assertDoesNotInclude(metrics, 'cr-local', 'metrics must not expose high-cardinality ids');
assertDoesNotInclude(metrics, 'AR-', 'metrics must not expose run ids');
assertDoesNotInclude(metrics, 'REL-', 'metrics must not expose release ids');

console.log('Metrics local smoke passed.');

function emitRequestMetric({ method, originalUrl, statusCode }) {
  let finishListener;
  const request = {
    headers: {
      'x-actor-id': 'metrics-local-smoke',
      'x-gmi-roles': 'analysis_runner',
    },
    method,
    originalUrl,
    requestId: `metrics-${method}-${statusCode}`,
  };
  const response = {
    statusCode,
    on: (event, listener) => {
      if (event === 'finish') {
        finishListener = listener;
      }
    },
  };

  accessLogMiddleware(request, response, () => undefined);

  if (!finishListener) {
    throw new Error('accessLogMiddleware did not register a finish listener.');
  }

  finishListener();
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) {
    throw new Error(`${label}: expected metrics to include ${JSON.stringify(expected)}`);
  }
}

function assertDoesNotInclude(value, forbidden, label) {
  if (value.includes(forbidden)) {
    throw new Error(`${label}: metrics unexpectedly included ${JSON.stringify(forbidden)}`);
  }
}
