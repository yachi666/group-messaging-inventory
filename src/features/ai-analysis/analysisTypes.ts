import type { Channel } from '../../domain/inventory';

export type AiMessageType =
  | 'OTP'
  | 'Transaction'
  | 'Marketing'
  | 'Profile update'
  | 'Alert';

export type GovernanceClassification =
  | 'Regulatory'
  | 'Servicing'
  | 'Marketing';

export type AnalysisReviewStatus = 'needs-review' | 'reviewed' | 'merged';

export type AnalysisLifecycleStatus = 'active' | 'demised';

export type SimilarTemplateMatch = {
  templateId: string;
  name: string;
  similarity: number;
};

export type AiTemplateAnalysisResult = {
  id: string;
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
  explanation: string;
};
