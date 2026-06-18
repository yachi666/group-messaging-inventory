import type { AiTemplateAnalysisResult } from './analysisTypes';

export const initialAnalysisResults = [
  {
    id: 'ATA-001248',
    templateId: 'TPL-2048',
    name: 'Payment due reminder',
    channel: 'SMS',
    analyzedAt: '2026-06-17T09:24:00Z',
    maskedMessage:
      'Your payment of £***.** is due on ** June. Please sign in to review your account.',
    extractedPattern:
      'Your payment of {amount} is due on {dueDate}. Please sign in to review your account.',
    placeholders: ['amount', 'dueDate'],
    aiMessageType: 'Transaction',
    governanceClassification: 'Servicing',
    confidence: 97,
    qualityScore: 94,
    nearestMatch: {
      templateId: 'TPL-1987',
      name: 'Upcoming payment reminder',
      similarity: 91,
    },
    anomalies: [],
    owner: 'Collections Operations',
    reviewStatus: 'reviewed',
    lifecycleStatus: 'active',
    explanation:
      'The message provides an account-specific payment deadline and contains no promotional call to action.',
  },
  {
    id: 'ATA-001249',
    templateId: 'TPL-3114',
    name: 'Card fraud alert',
    channel: 'Push',
    analyzedAt: '2026-06-17T09:31:00Z',
    maskedMessage:
      'We noticed a card payment of £***.** at M******** for card ending ****. Was this you?',
    extractedPattern:
      'We noticed a card payment of {amount} at {merchant} for card ending {cardLast4}. Was this you?',
    placeholders: ['amount', 'merchant', 'cardLast4'],
    aiMessageType: 'Alert',
    governanceClassification: 'Regulatory',
    confidence: 99,
    qualityScore: 96,
    nearestMatch: {
      templateId: 'TPL-3098',
      name: 'Unusual card activity alert',
      similarity: 94,
    },
    anomalies: ['Urgent response requested without a stated response window'],
    owner: 'Fraud Operations',
    reviewStatus: 'needs-review',
    lifecycleStatus: 'active',
    explanation:
      'The message warns about potentially unauthorised activity and supports a fraud-control obligation.',
  },
  {
    id: 'ATA-001250',
    templateId: 'TPL-0872',
    name: 'OTP verification',
    channel: 'SMS',
    analyzedAt: '2026-06-17T10:02:00Z',
    maskedMessage:
      'Your one-time passcode is ******. It expires in ** minutes. Never share this code.',
    extractedPattern:
      'Your one-time passcode is {otp}. It expires in {expiryMinutes} minutes. Never share this code.',
    placeholders: ['otp', 'expiryMinutes'],
    aiMessageType: 'OTP',
    governanceClassification: 'Servicing',
    confidence: 100,
    qualityScore: 98,
    anomalies: [],
    owner: 'Digital Identity',
    reviewStatus: 'merged',
    lifecycleStatus: 'active',
    explanation:
      'The short-lived credential and anti-sharing instruction identify an authentication service message.',
  },
  {
    id: 'ATA-001251',
    templateId: 'TPL-4421',
    name: 'Mortgage renewal notice',
    channel: 'Email',
    analyzedAt: '2026-06-17T10:18:00Z',
    maskedMessage:
      'Your mortgage deal for account ending **** expires on **/**/****. Explore your renewal options.',
    extractedPattern:
      'Your mortgage deal for account ending {accountLast4} expires on {expiryDate}. Explore your renewal options.',
    placeholders: ['accountLast4', 'expiryDate'],
    aiMessageType: 'Marketing',
    governanceClassification: 'Marketing',
    confidence: 82,
    qualityScore: 79,
    nearestMatch: {
      templateId: 'TPL-4403',
      name: 'Mortgage product expiry notice',
      similarity: 86,
    },
    anomalies: ['Service deadline and promotional language are combined'],
    owner: 'Mortgage Retention',
    reviewStatus: 'needs-review',
    lifecycleStatus: 'active',
    explanation:
      'Although triggered by a product expiry, the invitation to explore options makes the communication promotional.',
  },
  {
    id: 'ATA-001252',
    templateId: 'TPL-1560',
    name: 'Statement available',
    channel: 'In-app',
    analyzedAt: '2026-06-17T11:05:00Z',
    maskedMessage:
      'Your **** 2026 statement for account ending **** is ready to view securely in the app.',
    extractedPattern:
      'Your {statementMonth} {statementYear} statement for account ending {accountLast4} is ready to view securely in the app.',
    placeholders: ['statementMonth', 'statementYear', 'accountLast4'],
    aiMessageType: 'Alert',
    governanceClassification: 'Regulatory',
    confidence: 95,
    qualityScore: 93,
    anomalies: [],
    owner: 'Customer Statements',
    reviewStatus: 'reviewed',
    lifecycleStatus: 'active',
    explanation:
      'The message notifies the customer that a required account document is available through a secure channel.',
  },
  {
    id: 'ATA-001253',
    templateId: 'TPL-2635',
    name: 'Loan disbursement',
    channel: 'Email',
    analyzedAt: '2026-06-17T11:42:00Z',
    maskedMessage:
      'We sent £**,***.** to account ending **** on **/**/****. Reference: L********.',
    extractedPattern:
      'We sent {amount} to account ending {accountLast4} on {disbursementDate}. Reference: {loanReference}.',
    placeholders: ['amount', 'accountLast4', 'disbursementDate', 'loanReference'],
    aiMessageType: 'Transaction',
    governanceClassification: 'Servicing',
    confidence: 91,
    qualityScore: 87,
    nearestMatch: {
      templateId: 'TPL-2601',
      name: 'Funds transfer confirmation',
      similarity: 78,
    },
    anomalies: ['Legacy template omits a support contact'],
    owner: 'Consumer Lending Operations',
    reviewStatus: 'merged',
    lifecycleStatus: 'demised',
    explanation:
      'The message confirms a completed loan transaction; the legacy version has been consolidated into a newer template.',
  },
] as const satisfies ReadonlyArray<AiTemplateAnalysisResult>;
