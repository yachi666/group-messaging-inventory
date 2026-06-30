import type {
  AiTemplateAnalysisOutput,
  AnalysisEffort,
  GovernanceClassification,
} from '@gmi/domain';
import type { PolicyDecision } from '@gmi/policy';

export type VerificationSeedCase = {
  slug: string;
  effort: AnalysisEffort;
  reason: string;
  expectedPolicyDecision: PolicyDecision;
  expectedClassification: GovernanceClassification;
  policyContext?: {
    piiMaskingPassed?: boolean;
    hasRetiredButLiveTraffic?: boolean;
    hasClassificationConflict?: boolean;
  };
  output: AiTemplateAnalysisOutput;
};

export const verificationSeedCases: VerificationSeedCase[] = [
  {
    slug: 'payment-reminder-auto',
    effort: 'normal',
    reason: 'Seed auto-recorded servicing payment reminder',
    expectedPolicyDecision: 'auto_record',
    expectedClassification: 'Servicing',
    output: {
      extractedPattern: 'Your payment of {amount} is due on {due_date}.',
      placeholders: [
        { token: '{amount}', type: 'currency', confidence: 96 },
        { token: '{due_date}', type: 'date', confidence: 94 },
      ],
      aiMessageType: 'Transaction',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 96,
      qualityScore: 94,
      candidateMatches: [
        {
          useCaseId: 'UC-PAYMENT-REMINDER',
          name: 'Payment reminder',
          similarity: 96,
          reason: 'Amount and due date match the approved servicing reminder use case.',
        },
      ],
      anomalies: [],
      businessExplanation: ['The message supports a known repayment obligation.'],
      technicalEvidence: ['Seed case covers high-confidence auto-record routing.'],
    },
  },
  {
    slug: 'otp-low-confidence-review',
    effort: 'normal',
    reason: 'Seed review-required OTP low confidence match',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Servicing',
    output: {
      extractedPattern: 'Use {otp} to continue.',
      placeholders: [{ token: '{otp}', type: 'otp', confidence: 98 }],
      aiMessageType: 'OTP',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 68,
      qualityScore: 76,
      candidateMatches: [
        {
          useCaseId: 'UC-AUTHENTICATION',
          name: 'Authentication',
          similarity: 65,
          reason: 'OTP token is clear, but approved product context is weak.',
        },
      ],
      anomalies: ['low_confidence_candidate_match'],
      businessExplanation: ['The message is operational but needs use-case confirmation.'],
      technicalEvidence: ['Seed case covers low-confidence review routing.'],
    },
  },
  {
    slug: 'pii-blocked',
    effort: 'enhanced_review',
    reason: 'Seed blocked PII masking review case',
    expectedPolicyDecision: 'blocked',
    expectedClassification: 'Regulatory',
    policyContext: {
      piiMaskingPassed: false,
    },
    output: {
      extractedPattern: 'Hi {customer}, account {account} needs attention.',
      placeholders: [
        { token: '{customer}', type: 'name', confidence: 91 },
        { token: '{account}', type: 'account', confidence: 93 },
      ],
      aiMessageType: 'Alert',
      governanceClassificationSuggestion: 'Regulatory',
      overallConfidence: 40,
      qualityScore: 45,
      candidateMatches: [
        {
          useCaseId: 'UC-UNKNOWN',
          name: 'Unknown high-risk servicing',
          similarity: 50,
          reason: 'PII masking failed before provider promotion.',
        },
      ],
      anomalies: ['pii_masking_required_before_provider'],
      businessExplanation: ['The message should be blocked until masking evidence is clean.'],
      technicalEvidence: ['Seed case covers the pre-provider PII block path.'],
    },
  },
  {
    slug: 'candidate-mapping-approval',
    effort: 'normal',
    reason: 'Seed candidate mapping approval package',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Servicing',
    output: {
      extractedPattern: 'Your card repayment of {amount} posts on {posting_date}.',
      placeholders: [
        { token: '{amount}', type: 'currency', confidence: 94 },
        { token: '{posting_date}', type: 'date', confidence: 92 },
      ],
      aiMessageType: 'Transaction',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 87,
      qualityScore: 90,
      candidateMatches: [
        {
          useCaseId: 'UC-CARD-REPAYMENT',
          name: 'Card repayment',
          similarity: 84,
          reason: 'The template appears to map to card repayment but needs checker approval.',
        },
      ],
      anomalies: ['candidate_mapping_requires_checker'],
      businessExplanation: ['The candidate use case should be promoted through maker-checker.'],
      technicalEvidence: ['Seed case drives approved mapping change request evidence.'],
    },
  },
  {
    slug: 'retired-but-live',
    effort: 'normal',
    reason: 'Seed retired-but-live lifecycle approval package',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Servicing',
    policyContext: {
      hasRetiredButLiveTraffic: true,
    },
    output: {
      extractedPattern: 'Your retention offer ends on {expiry_date}.',
      placeholders: [{ token: '{expiry_date}', type: 'date', confidence: 91 }],
      aiMessageType: 'Marketing',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 82,
      qualityScore: 84,
      candidateMatches: [
        {
          useCaseId: 'UC-RETENTION',
          name: 'Retention',
          similarity: 80,
          reason: 'Live traffic exists for a lifecycle candidate marked for retirement.',
        },
      ],
      anomalies: ['retired_but_live_traffic'],
      businessExplanation: ['Lifecycle status requires human review before retirement.'],
      technicalEvidence: ['Seed case drives pending lifecycle change request evidence.'],
    },
  },
  {
    slug: 'classification-conflict-changes',
    effort: 'normal',
    reason: 'Seed changes-requested approval package',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Regulatory',
    policyContext: {
      hasClassificationConflict: true,
    },
    output: {
      extractedPattern: 'Confirm consent for {program_name} by {deadline}.',
      placeholders: [
        { token: '{program_name}', type: 'unknown', confidence: 88 },
        { token: '{deadline}', type: 'date', confidence: 94 },
      ],
      aiMessageType: 'Alert',
      governanceClassificationSuggestion: 'Regulatory',
      overallConfidence: 74,
      qualityScore: 81,
      candidateMatches: [
        {
          useCaseId: 'UC-CLASSIFICATION-REVIEW',
          name: 'Classification review',
          similarity: 77,
          reason: 'Deterministic and AI classification signals conflict.',
        },
      ],
      anomalies: ['classification_conflict'],
      businessExplanation: ['Checker should request more evidence before approving mapping.'],
      technicalEvidence: ['Seed case covers ChangesRequested evidence.'],
    },
  },
  {
    slug: 'marketing-rejected',
    effort: 'normal',
    reason: 'Seed rejected approval package',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Marketing',
    output: {
      extractedPattern: 'Save {discount} on your next order before {expiry_date}.',
      placeholders: [
        { token: '{discount}', type: 'unknown', confidence: 90 },
        { token: '{expiry_date}', type: 'date', confidence: 93 },
      ],
      aiMessageType: 'Marketing',
      governanceClassificationSuggestion: 'Marketing',
      overallConfidence: 79,
      qualityScore: 80,
      candidateMatches: [
        {
          useCaseId: 'UC-MARKETING-CAMPAIGN',
          name: 'Marketing campaign',
          similarity: 78,
          reason: 'Marketing intent is clear, but consent evidence is missing.',
        },
      ],
      anomalies: ['missing_marketing_consent_evidence'],
      businessExplanation: ['The mapping should be rejected without consent evidence.'],
      technicalEvidence: ['Seed case covers rejected mapping change request evidence.'],
    },
  },
  {
    slug: 'regulatory-enhanced-review',
    effort: 'enhanced_review',
    reason: 'Seed enhanced review regulatory disclosure case',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Regulatory',
    output: {
      extractedPattern: 'Important notice: your rate changes to {rate} on {effective_date}.',
      placeholders: [
        { token: '{rate}', type: 'unknown', confidence: 91 },
        { token: '{effective_date}', type: 'date', confidence: 95 },
      ],
      aiMessageType: 'Alert',
      governanceClassificationSuggestion: 'Regulatory',
      overallConfidence: 93,
      qualityScore: 92,
      candidateMatches: [
        {
          useCaseId: 'UC-RATE-CHANGE-DISCLOSURE',
          name: 'Rate change disclosure',
          similarity: 94,
          reason: 'Regulatory disclosure requires enhanced review evidence.',
        },
      ],
      anomalies: ['enhanced_review_requested'],
      businessExplanation: ['The template communicates a regulated rate change.'],
      technicalEvidence: ['Seed case covers enhanced-review routing.'],
    },
  },
  {
    slug: 'candidate-version-drift',
    effort: 'normal',
    reason: 'Seed candidate version drift review case',
    expectedPolicyDecision: 'review_required',
    expectedClassification: 'Servicing',
    output: {
      extractedPattern:
        'Your plan will renew on {renewal_date} with benefits {benefit_code}.',
      placeholders: [
        { token: '{renewal_date}', type: 'date', confidence: 94 },
        { token: '{benefit_code}', type: 'unknown', confidence: 72 },
      ],
      aiMessageType: 'Alert',
      governanceClassificationSuggestion: 'Servicing',
      overallConfidence: 82,
      qualityScore: 76,
      candidateMatches: [],
      anomalies: ['candidate_version_drift', 'no_candidate_match'],
      businessExplanation: ['Renewal wording appears valid, but candidate mapping drifted.'],
      technicalEvidence: ['Seed case covers no-candidate review routing.'],
    },
  },
];
