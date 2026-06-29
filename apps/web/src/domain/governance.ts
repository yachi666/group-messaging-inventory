export type UseCaseLifecycle = 'Candidate' | 'Active' | 'Retired';
export type ApprovalState = 'Draft' | 'Pending Approval' | 'Changes Requested' | 'Approved';
export type TemplateLifecycle = 'Active' | 'No Traffic' | 'Retired';
export type MappingState = 'Assigned' | 'Unassigned' | 'Suggested' | 'Mapping Change Pending';
export type GovernanceClassification = 'Regulatory' | 'Servicing' | 'Marketing';

export type GovernanceUseCase = {
  id: string;
  name: string;
  description: string;
  classification: GovernanceClassification;
  markets: string[];
  platforms: string[];
  channels: string[];
  templateIds: string[];
  messageOwner: string;
  integratingOwner: string;
  lifecycle: UseCaseLifecycle;
  approval: ApprovalState;
  monthlyVolume: number;
  lastActivity: string;
  confidence: number;
  evidenceCount: number;
  governanceIssues: string[];
  pendingChanges?: number;
};

export type GovernanceTemplate = {
  uuid: string;
  templateId: string;
  platform: string;
  tenant: string;
  parentUseCaseId?: string;
  currentVersion: string;
  candidateVersion?: string;
  channel: string;
  market: string;
  sender: string;
  mapping: MappingState;
  lifecycle: TemplateLifecycle;
  monthlyVolume: number;
  lastSeen: string;
  confidence: number;
  approval: ApprovalState;
  maskedContent: string;
  variables: string[];
};

export type GovernanceReview = {
  id: string;
  kind: 'Discovery' | 'Approval';
  type: string;
  object: string;
  objectId: string;
  platform: string;
  market: string;
  channel: string;
  confidence: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  ageing: number;
  assignee: string;
  status: 'Open' | 'In Review' | 'Pending Approval' | 'Changes Requested' | 'Resolved';
  maker?: string;
  checker?: string;
};
