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
  templateId: string;
  name: string;
  channel: 'SMS' | 'Email' | 'Push' | 'In-app';
  analyzedAt: string;
  maskedMessage: string;
  extractedPattern: string;
  placeholders: string[];
  aiMessageType: AiMessageType;
  governanceClassification: GovernanceClassification;
  confidence: number;
  qualityScore: number;
  nearestMatch?: SimilarTemplateMatch;
  anomalies: string[];
  owner: string;
  reviewStatus: AnalysisReviewStatus;
  lifecycleStatus: AnalysisLifecycleStatus;
  explanation: string[];
};

export type AiTemplateAnalysisFilter = {
  templateId?: string;
  channel?: 'SMS' | 'Email' | 'Push' | 'In-app';
  aiMessageType?: AiMessageType;
  reviewStatus?: AnalysisReviewStatus;
  owner?: string;
  minConfidence?: number;
  maxConfidence?: number;
  q?: string;
};
