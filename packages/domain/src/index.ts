export type Platform = 'MDP' | 'SFMC' | 'ICCM' | 'IRIS';

export type Channel = 'SMS' | 'Email' | 'Push' | 'In-app';

export type GovernanceClassification = 'Regulatory' | 'Servicing' | 'Marketing';

export type UseCaseLifecycleStatus = 'Candidate' | 'Active' | 'Retired';

export type TemplateLifecycleStatus = 'Active' | 'No Traffic' | 'Retired';

export type TemplateVersionStatus = 'Candidate' | 'Current' | 'Superseded';

export type MappingStatus =
  | 'Assigned'
  | 'Unassigned'
  | 'Suggested'
  | 'Mapping Change Pending';

export type ApprovalStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Changes Requested'
  | 'Approved'
  | 'Rejected'
  | 'Withdrawn';

export type AnalysisRunStatus =
  | 'Queued'
  | 'Running'
  | 'Retrying'
  | 'Succeeded'
  | 'Failed'
  | 'Cancelled';

export type ChangeRequestStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Rejected'
  | 'ChangesRequested'
  | 'Withdrawn';

export type ReviewTaskStatus =
  | 'Open'
  | 'Assigned'
  | 'InReview'
  | 'PendingApproval'
  | 'Resolved'
  | 'Dismissed';

export type AnalysisEffort = 'deterministic_only' | 'normal' | 'enhanced_review';

export type AnalysisTriggerType =
  | 'production_discovery'
  | 'manual_reanalysis'
  | 'candidate_version'
  | 'evaluation_replay';

export type TemplateIdentity = {
  platform: Platform;
  tenantOrWorkspace: string;
  externalTemplateId: string;
};

export type TemplateRef = TemplateIdentity & {
  templateUuid: string;
};

export type PlaceholderEvidence = {
  token: string;
  type: 'currency' | 'date' | 'account' | 'otp' | 'name' | 'unknown';
  confidence: number;
};

export type CandidateUseCaseMatch = {
  useCaseId: string;
  name: string;
  similarity: number;
  reason: string;
};

export type AiTemplateAnalysisOutput = {
  extractedPattern: string;
  placeholders: ReadonlyArray<PlaceholderEvidence>;
  aiMessageType: string;
  governanceClassificationSuggestion: GovernanceClassification;
  overallConfidence: number;
  qualityScore: number;
  candidateMatches: ReadonlyArray<CandidateUseCaseMatch>;
  anomalies: ReadonlyArray<string>;
  businessExplanation: ReadonlyArray<string>;
  technicalEvidence: ReadonlyArray<string>;
};
