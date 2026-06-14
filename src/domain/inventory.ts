export type Platform = 'MDP' | 'SFMC' | 'ICCM' | 'IRIS';

export type Channel = 'SMS' | 'Email' | 'Push' | 'In-app';

export type Classification = 'Regulatory' | 'Servicing' | 'Marketing';

export type UseCaseStatus = 'candidate' | 'confirmed' | 'retired';

export type OwnerStatus = 'confirmed' | 'pending-checker' | 'needs-owner';

export type AuditStatus = 'approved' | 'needs-evidence' | 'pending-checker';

export type ConfidenceBand = 'high' | 'medium' | 'low';

export type SignalSeverity = 'high' | 'medium' | 'low';

export type DriftType =
  | 'retired-but-live'
  | 'new-sender-identity'
  | 'new-template'
  | 'unknown-traffic'
  | 'volume-anomaly';

export type CandidateUseCase = {
  id: string;
  name: string;
  status: UseCaseStatus;
  market: string;
  entity: string;
  lob: string;
  platform: Platform;
  channel: Channel;
  tenant: string;
  senderIdentity: string;
  templateReference: string;
  monthlyVolume: number;
  deliveryOutcomes: {
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
  };
  messageOwner: string;
  integratingSystemOwner: string;
  classification: Classification;
  confidence: number;
  ownerStatus: OwnerStatus;
  auditStatus: AuditStatus;
  evidenceReference: string;
  latestValidationDate: string;
  matchExplanation: {
    rulesHit: string[];
    clusterId?: string;
    contentFingerprint?: string;
  };
};

export type CoveragePoint = {
  month: string;
  matched: number;
  unknown: number;
};

export type TriageItem = {
  id: string;
  type: DriftType;
  title: string;
  market: string;
  platform: Platform;
  channel: Channel;
  ageingDays: number;
  confidence: number;
  recommendedAction: string;
};

export type EvidenceMarketReadiness = {
  market: string;
  complete: number;
  missing: number;
};

export type AuditRecord = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  approvalStatus: 'approved' | 'submitted' | 'rejected';
};

export type DashboardMetrics = {
  trafficMatchedPercentage: number;
  unknownTrafficCount: number;
  driftExceptionCount: number;
  ownerConfirmedPercentage: number;
};

export type AnalyticsSignal = {
  id: string;
  label: string;
  market: string;
  platform: Platform;
  channel: Channel;
  currentValue: string;
  baselineValue: string;
  severity: SignalSeverity;
  recommendedAction: string;
};

export type GovernanceEvent = {
  id: string;
  actor: string;
  event: string;
  target: string;
  timestamp: string;
  scope: string;
  controlStatus: AuditStatus;
};

export type PolicyControl = {
  id: string;
  label: string;
  description: string;
  owner: string;
  status: 'enabled' | 'monitoring' | 'draft';
  impact: string;
};
