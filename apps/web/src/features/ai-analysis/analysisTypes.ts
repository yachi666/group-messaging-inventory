import type { Channel } from '../../domain/inventory';

export type AiMessageType =
  | 'OTP'
  | 'Transaction'
  | 'Marketing'
  | 'Profile update'
  | 'Alert';

export type GovernanceClassification = 'Regulatory' | 'Servicing' | 'Marketing';
export type AnalysisReviewStatus = 'needs-review' | 'reviewed' | 'merged';
export type AnalysisLifecycleStatus = 'active' | 'demised';

export type SimilarTemplateMatch = {
  templateId: string;
  name: string;
  similarity: number;
};

export type AiTemplateAnalysisResult = {
  id: string;
  templateUuid: string;
  versionId: string;
  templateId: string;
  name: string;
  channel: Channel;
  analyzedAt: string;
  maskedMessage: string;
  extractedPattern: string;
  placeholders: ReadonlyArray<string>;
  aiMessageType: AiMessageType;
  governanceClassification: GovernanceClassification;
  confidence: number;
  qualityScore: number;
  nearestMatch?: SimilarTemplateMatch;
  anomalies: ReadonlyArray<string>;
  owner: string;
  reviewStatus: AnalysisReviewStatus;
  lifecycleStatus: AnalysisLifecycleStatus;
  explanation: ReadonlyArray<string>;
};

export type AiTemplateAnalysisFilter = {
  templateId?: string;
  channel?: Channel;
  aiMessageType?: AiMessageType;
  reviewStatus?: AnalysisReviewStatus;
  owner?: string;
  minConfidence?: number;
  maxConfidence?: number;
  q?: string;
};

export type LatestAnalysisEvaluation = {
  source: {
    kind: 'postgres' | 'replay_fallback';
    persisted: boolean;
    generatedAt: string;
  };
  evaluation: {
    suite: string;
    datasetVersion: string;
    mode: 'replay' | 'provider';
    verdict: 'pass' | 'fail';
    metrics: {
      caseCount: number;
      schemaPassRate: number;
      classificationAccuracy: number;
      routingAccuracy: number;
      placeholderRecall: number;
    };
    thresholds: {
      minCaseCount: number;
      minSchemaPassRate: number;
      minClassificationAccuracy: number;
      minRoutingAccuracy: number;
      minPlaceholderRecall: number;
    };
    failedCaseIds: ReadonlyArray<string>;
  };
  release: {
    releaseId: string;
    status: 'ReadyForPromotion' | 'BlockedByEvaluation';
    promotionAllowed: boolean;
    evidenceHash: string;
    pipeline: {
      pipelineVersion: string;
      promptVersion: string;
      modelProvider: string;
      modelName: string;
      rulesetVersion: string;
    };
  };
};
