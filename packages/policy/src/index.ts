import type { AiTemplateAnalysisOutput, AnalysisEffort } from '@gmi/domain';

export type MaskingFindingType =
  | 'email'
  | 'phone'
  | 'account'
  | 'name'
  | 'government_id';

export type MaskingFinding = {
  type: MaskingFindingType;
  token: string;
};

export type MaskTemplateContentResult = {
  maskedContent: string;
  findings: ReadonlyArray<MaskingFinding>;
  passed: boolean;
};

export type PolicyDecision =
  | 'auto_record'
  | 'review_required'
  | 'change_request_required'
  | 'blocked';

export type EvaluateAnalysisPolicyInput = {
  output: AiTemplateAnalysisOutput;
  effort: AnalysisEffort;
  piiMaskingPassed: boolean;
  hasRetiredButLiveTraffic: boolean;
  hasClassificationConflict: boolean;
};

export type EvaluateAnalysisPolicyResult = {
  decision: PolicyDecision;
  reasons: ReadonlyArray<string>;
};

export function evaluateAnalysisPolicy(
  input: EvaluateAnalysisPolicyInput,
): EvaluateAnalysisPolicyResult {
  const reasons: string[] = [];

  if (!input.piiMaskingPassed) {
    return {
      decision: 'blocked',
      reasons: ['pii_masking_failed'],
    };
  }

  if (input.hasRetiredButLiveTraffic) {
    return {
      decision: 'review_required',
      reasons: ['retired_but_live_traffic'],
    };
  }

  if (input.hasClassificationConflict) {
    return {
      decision: 'review_required',
      reasons: ['classification_conflict'],
    };
  }

  if (input.output.overallConfidence < 90) {
    reasons.push('low_confidence');
  }

  if (input.output.candidateMatches.length === 0) {
    reasons.push('no_candidate_match');
  }

  if (input.effort === 'enhanced_review') {
    reasons.push('enhanced_review_requested');
  }

  if (reasons.length > 0) {
    return {
      decision: 'review_required',
      reasons,
    };
  }

  return {
    decision: 'auto_record',
    reasons: ['high_confidence_no_policy_exception'],
  };
}

export function maskTemplateContent(content: string): MaskTemplateContentResult {
  const findings: MaskingFinding[] = [];
  let maskedContent = content;

  maskedContent = replaceWithFinding(
    maskedContent,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    '{{email}}',
    'email',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\bHKID\s+[A-Z]\d{6}\([0-9A]\)(?=\s|$|[.,;])/g,
    'HKID {{government_id}}',
    'government_id',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\bIBAN\s+[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g,
    'IBAN {{account}}',
    'account',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\b(?:account|acct)\s*(?:number|no\.?|#)?\s*[:#-]?\s*\d{6,19}\b/gi,
    'account {{account}}',
    'account',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /(?<!\d)(?:\+?\d{1,3}[\s.-])?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/g,
    '{{phone}}',
    'phone',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /(?<!\d)(?:\+852[\s.-]?)?[569]\d{3}[\s.-]?\d{4}\b/g,
    '{{phone}}',
    'phone',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /(?<!\d)(?:\+86[\s.-]?)?1[3-9]\d[\s.-]?\d{4}[\s.-]?\d{4}\b/g,
    '{{phone}}',
    'phone',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\b(?:SG\s+mobile\s*)?[689]\d{3}[\s.-]?\d{4}\b/gi,
    '{{phone}}',
    'phone',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\b(?:card|pan)\s*[:#-]?\s*(?:\d[ -]?){13,19}\b/gi,
    '{{account}}',
    'account',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\b\d{12,19}\b/g,
    '{{account}}',
    'account',
    findings,
  );
  maskedContent = replaceWithFinding(
    maskedContent,
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    '{{name}}',
    'name',
    findings,
  );

  return {
    maskedContent,
    findings,
    passed: !containsHighRiskRawPii(maskedContent),
  };
}

function replaceWithFinding(
  content: string,
  pattern: RegExp,
  replacement: string,
  type: MaskingFindingType,
  findings: MaskingFinding[],
) {
  return content.replace(pattern, (token) => {
    findings.push({
      type,
      token,
    });

    return replacement;
  });
}

function containsHighRiskRawPii(content: string) {
  return (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(content) ||
    /\bHKID\s+[A-Z]\d{6}\([0-9A]\)(?=\s|$|[.,;])/.test(content) ||
    /\bIBAN\s+[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/.test(content) ||
    /\b(?:account|acct)\s*(?:number|no\.?|#)?\s*[:#-]?\s*\d{6,19}\b/i.test(content) ||
    /\b(?:card|pan)\s*[:#-]?\s*(?:\d[ -]?){13,19}\b/i.test(content) ||
    /\b\d{12,19}\b/.test(content) ||
    /(?<!\d)(?:\+852[\s.-]?)?[569]\d{3}[\s.-]?\d{4}\b/.test(content) ||
    /(?<!\d)(?:\+86[\s.-]?)?1[3-9]\d[\s.-]?\d{4}[\s.-]?\d{4}\b/.test(content) ||
    /\b(?:SG\s+mobile\s*)?[689]\d{3}[\s.-]?\d{4}\b/i.test(content) ||
    /(?<!\d)(?:\+?\d{1,3}[\s.-])?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/.test(
      content,
    )
  );
}
