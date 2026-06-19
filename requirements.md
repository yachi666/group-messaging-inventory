# Group Messaging Inventory Product Requirements

## 1. Document Purpose

This document defines the product requirements and MVP scope for the Group Messaging Inventory frontend. It replaces the previous requirements and reflects the agreed product model, information architecture, governance workflow, and AI explainability requirements.

## 2. Product Vision

Group Messaging Inventory is a governed system for discovering, organizing, reviewing, and maintaining outbound messaging use cases and their underlying templates.

The product must help business, technology, and governance users answer:

- What messaging use cases exist and why are they active?
- Which templates implement each use case?
- Which platforms, channels, markets, tenants, and sender identities are involved?
- What production traffic is matched, unmatched, new, changed, or retired-but-live?
- What did the AI infer, why did it infer it, and how confident was it?
- Who changed or approved the governed data, and when?

AI analysis is a supporting capability across the product. It is not the primary business object or a standalone top-level product area.

## 3. Product Principles

- **Use-case first:** Use Case is the primary business and governance object.
- **Template as an implementation asset:** Templates are managed independently beneath a Use Case.
- **Version, never overwrite:** Material content changes create a Template Version and preserve history.
- **Human accountability:** AI produces suggestions; authorized users make governed decisions.
- **Maker-checker control:** Important changes require approval before becoming effective.
- **Explainability by default:** AI conclusions must include accessible business explanations and expandable technical evidence.
- **Operational clarity:** Dashboards summarize; lists manage; review queues drive action.
- **Auditability:** Object, analysis, and approval histories must remain distinguishable and traceable.

## 4. Users and Roles

### 4.1 Business Maker

Business Makers can:

- View Use Cases, Templates, traffic, and analysis within their authorized scope.
- Enrich and edit system-generated Candidate Use Cases and propose changes to approved Use Cases.
- Add or correct ownership, classification, evidence, and business metadata.
- Associate unmatched Templates or traffic with a Use Case.
- Submit changes for Governance approval.
- Respond to requests for changes.

Business Makers cannot approve their own changes.

### 4.2 Governance Team

The centralized Governance Team has global visibility and can:

- Enrich and edit system-discovered Use Cases and Templates, subject to governance approval.
- Review unmatched data and candidate objects.
- Approve, reject, or request changes to submitted work.
- Merge Use Cases, retire or reactivate governed objects, and manage evidence.
- Review AI explanations, object histories, and approval histories.

A Governance user cannot approve a change they initiated. A second Governance user must act as Checker.

### 4.3 Viewer

Viewers can:

- Search, filter, and inspect authorized inventory data.
- View AI explanations and approved governance records.
- Export data within their authorized scope.

### 4.4 Administrator

Administrators manage:

- Users, roles, and data-access scope.
- Matching and classification configuration.
- Workflow and approval configuration.
- System-level settings and technical operations.

## 5. Domain Model

```text
Use Case
  └── Template
        └── Template Version
              ├── Analysis Run
              └── Production Events

Review Task / Change Request may reference any governed object.
```

### 5.1 Use Case

A Use Case represents the business purpose for sending a class of messages, for example, "Credit card repayment reminder." Use Cases originate from system discovery and cannot be created manually from a blank form in the MVP.

Required and supported attributes include:

- Stable internal Use Case ID.
- Name and description.
- Market and Line of Business.
- Classification: Regulatory, Servicing, or Marketing.
- Message Owner.
- Integrating System Owner.
- Contact details.
- Lifecycle status.
- Approval status.
- Evidence references and evidence completeness.
- Associated Templates.
- Aggregated traffic and delivery outcomes.
- Creation, validation, and last-updated metadata.

One Use Case can contain multiple Templates. A Use Case may span several platforms, channels, markets, languages, or technical implementations.

### 5.2 Template

A Template represents a technical messaging asset that implements a Use Case. Templates originate from production discovery and cannot be created manually in the MVP.

The Template business identity is the combination:

```text
Platform + Tenant/Workspace + Template ID
```

Template ID alone is not globally unique. The system must also assign a stable internal Template UUID so that corrected external metadata does not break historical references.

Supported Template attributes include:

- Internal Template UUID.
- External Template ID.
- Platform.
- Tenant or Workspace.
- Parent Use Case.
- Channel.
- Market.
- Sender Identity.
- Template format.
- Current Template Version.
- Mapping status.
- Lifecycle status.
- Approval status.
- Monthly volume and delivery outcomes.
- First Seen and Last Seen timestamps.
- Match confidence.

A Template can be temporarily unassigned. An unassigned Template must remain discoverable through the Template List and Review Queue.

In the initial product model, a Template can belong to only one active parent Use Case at a time. Reassigning it to another Use Case is a governed change.

### 5.3 Template Version

When content or other materially governed template configuration changes under the same Template business identity, the system creates a new Template Version rather than a new Template.

A Template Version includes:

- Version ID and version number.
- Parent Template UUID.
- Masked template content.
- Content fingerprint.
- Extracted variables and placeholders.
- Material configuration snapshot.
- First Seen, Last Seen, and effective dates.
- Change summary and difference from the previous version.
- Version status.
- Approval status.
- Associated Analysis Runs.

Detected versions must not overwrite previous versions. A newly detected version begins as a Candidate Version and is reviewed before becoming the Current approved version.

### 5.4 Production Event

Production Events represent actual outbound activity discovered from platform logs. Events or aggregates should retain enough lineage to support matching, volume reporting, delivery reporting, and investigation while minimizing message content and PII.

Relevant fields include:

- Platform, Tenant, and Workspace.
- Template ID and detected Template Version.
- Channel and Market.
- Sender Identity.
- Timestamp and source lineage.
- Message and correlation identifiers where available.
- Delivery outcome.
- Aggregated volume.
- Match status and confidence.

### 5.5 Analysis Run

An Analysis Run records one execution of deterministic rules, extraction logic, clustering, or AI analysis against a Template Version or review item.

It includes:

- Run ID and timestamps.
- Trigger and source input.
- Masked input summary.
- Extraction Flow steps and their outcomes.
- Normalized fields.
- Template pattern and extracted variables.
- Candidate Use Case matches.
- Classification suggestion.
- Field-level and overall confidence.
- Rules hit, Cluster ID, and content fingerprint.
- Model, prompt, extraction, and ruleset versions where applicable.
- Duration, warnings, errors, and retries.
- Final human decision when the run was used in review.

Analysis Runs are immutable historical evidence and must not be overwritten by later runs.

### 5.6 Review Task and Change Request

A Review Task represents work requiring human investigation or a governed decision. A Change Request represents a proposed change to approved data.

Tasks may reference:

- Unmatched production traffic.
- Unassigned Templates.
- Candidate Use Cases or Template Versions.
- Low-confidence matches.
- Drift and lifecycle exceptions.
- Proposed object changes, merges, retirements, or reactivations.

## 6. Status Models

Lifecycle, approval, mapping, and analysis states must remain separate.

### 6.1 Use Case Lifecycle

- Candidate
- Active
- Retired

### 6.2 Template Lifecycle

- Active
- No Traffic
- Retired

### 6.3 Template Version Status

- Candidate
- Current
- Superseded

### 6.4 Mapping Status

- Assigned
- Unassigned
- Suggested
- Mapping Change Pending

### 6.5 Approval Status

- Draft
- Pending Approval
- Changes Requested
- Approved
- Rejected
- Withdrawn

## 7. Information Architecture

The primary navigation contains:

1. Dashboard
2. Use Cases
3. Templates
4. Review Queue
5. Administration

Evidence, Analytics, AI Analysis, and Audit Trail are not separate top-level navigation items. They appear in the relevant object details, dashboards, queues, or administrative views.

## 8. Functional Requirements

### 8.1 Dashboard

The Dashboard provides an actionable summary of inventory and governance health.

It should display:

- Total Use Cases, Templates, and Template Versions.
- Counts by lifecycle and approval status.
- Percentage of production traffic matched to inventory.
- Unmatched traffic volume and trend.
- Unassigned Template count.
- Candidate and low-confidence item counts.
- Pending and overdue approval counts.
- Ownership and evidence completeness.
- Average approval time and ageing.
- Distribution and trends by Platform, Channel, Market, and Classification.
- High-priority drift and exception summaries.

Dashboard cards and charts should support drill-down into filtered lists or queues.

### 8.2 Use Case List

The Use Case List is the primary business inventory view.

It must support:

- Keyword search.
- Filtering by Platform, Channel, Market, Classification, owner, lifecycle, approval, and evidence status.
- Sorting and pagination.
- Saved views where practical.
- CSV export.
- Template count, traffic volume, and latest activity indicators.
- Navigation to Use Case Detail.

### 8.3 Use Case Detail

Use Case Detail replaces the current AI Template Analysis page as the main governed object page.

It contains:

#### Overview

- Core business metadata.
- Classification and lifecycle.
- Ownership and contacts.
- Current effective version and pending changes.
- Evidence completeness and recent activity.

#### Templates and Traffic

- Associated Templates and versions.
- Platform, Channel, Market, Tenant, and Sender coverage.
- Volume trends and delivery outcomes.
- Association, reassignment, and removal actions subject to approval.

#### AI Analysis

- Current AI conclusion and confidence.
- Extraction Flow.
- Candidate matches and match explanations.
- Field-level confidence.
- Analysis Run history and result differences.

#### Governance

- Evidence references.
- Effective and proposed values.
- Field-level change comparison.
- Submission reason and approval comments.

#### Activity

- Object changes.
- Approval decisions.
- Analysis activity.
- Template association and lifecycle events.

### 8.4 Template List

The Template List is a separate operational and technical inventory view.

It must display and filter by:

- Template ID.
- Platform.
- Tenant or Workspace.
- Parent Use Case.
- Current Version.
- Channel, Market, and Sender Identity.
- Mapping, lifecycle, and approval status.
- Monthly volume and Last Seen.
- Match confidence.

It must support:

- Assigned and Unassigned views.
- Search using the full composite identity.
- Navigation to Template Detail.
- Association with an existing Use Case.
- Keeping the Template unassigned, requesting re-analysis, or associating it with an existing Use Case. The system may later generate a Candidate Use Case.
- Submission of reassignment, retirement, or reactivation changes.
- CSV export.

### 8.5 Template Detail

Template Detail contains:

- Composite business identity and internal UUID.
- Parent Use Case.
- Platform, Tenant, Channel, Market, and Sender metadata.
- Current and historical Template Versions.
- Masked content, variables, and version differences.
- Traffic and delivery outcomes.
- AI Analysis and Extraction Flow.
- Similar Templates and candidate matches.
- Governance status and Activity history.

### 8.6 AI Analysis and Extraction Flow

AI Analysis serves both business and technical users through progressive disclosure.

The default Summary view shows:

- What was inferred.
- Recommended Use Case and Classification.
- Confidence and important uncertainty.
- Key business-readable reasons.
- Recommended human action.

Technical Details expand each Extraction Flow step:

```text
Ingestion
→ Normalization
→ Template Detection
→ Variable Extraction
→ Use Case Matching
→ Classification
```

Technical details include masked inputs, normalized outputs, extracted fields, deterministic rules, candidate scores, clustering information, fingerprints, model and ruleset versions, duration, warnings, errors, and retries.

AI Analysis is accessible from Use Case Detail, Template Detail, Review Task Detail, and an administrative Analysis Runs view.

### 8.7 Review Queue

The Review Queue contains two workspaces.

#### Discovery Review

Includes:

- Unmatched traffic.
- Unassigned Templates.
- Candidate Use Cases.
- Candidate Template Versions.
- Low-confidence matches.
- New Templates or Sender Identities.
- Retired-but-live and other drift exceptions.

Reviewers can:

- Associate an item with an existing Use Case.
- Enrich a system-generated Candidate Use Case when available; manual creation is not supported.
- Confirm or correct a Template Version.
- Reject noise or mark an item as not governed, with a reason.
- Review AI Analysis.
- Submit the resulting change for approval.

#### Governance Approval

Includes proposed:

- Use Case creation and edits.
- Template association or reassignment.
- Template Version confirmation.
- Classification, ownership, and evidence changes.
- Use Case merges.
- Candidate Use Case splits. Active Use Case splitting is not supported in the MVP.
- Retirement and reactivation.

Governance users can approve, reject, or request changes. The queue must support filters, assignment or claiming, ageing, SLA indicators, and approval history. Low-risk bulk actions may be considered after MVP.

### 8.8 Maker-Checker Workflow

Important changes follow:

```text
Draft
→ Pending Approval
→ Approved

Pending Approval
→ Changes Requested
→ Draft

Pending Approval
→ Rejected

Draft or Pending Approval
→ Withdrawn
```

Rules:

- Approved data remains effective until a new Change Request is approved.
- Pending changes must be visibly distinct from effective values.
- Reports, dashboards, and exports use approved effective values by default.
- Checkers can approve, reject, or request changes but should not silently rewrite a submitted request.
- Rejection and change requests require comments.
- A user cannot approve their own change.
- Each decision stores submitter, checker, timestamps, comments, field differences, and version snapshots.
- Non-governed comments and internal notes may save immediately.

### 8.9 Automatic Discovery and Matching

The system processing flow is:

```text
Production Events
→ Normalize metadata
→ Resolve Template composite identity
→ Detect Template Version
→ Match or suggest Use Case
→ Calculate confidence
→ Route for review when necessary
```

Expected routing behavior:

- Known Template and known version: update traffic and Last Seen.
- Known Template with materially changed content: create Candidate Version.
- Unknown composite Template identity: create an Unassigned Template candidate.
- High-confidence known mapping: apply the approved mapping and retain explanation.
- Low-confidence or unmatched item: create a Discovery Review task.
- Retired object with live traffic: create a drift task.

### 8.10 Audit and History

The product must separately retain:

- **Object History:** how Use Cases, Templates, and Template Versions changed.
- **Analysis History:** what rules or AI inferred at a point in time.
- **Approval History:** who proposed, reviewed, approved, rejected, or requested changes.

Important changes require field-level differences and immutable snapshots.

### 8.11 Administration

Administration includes:

- User, role, and scope management.
- Matching and classification configuration.
- Approval workflow settings.
- Analysis Runs search for technical and governance investigation.
- Audit Trail search.
- System configuration and processing status where relevant.

## 9. Reporting and Export

The MVP must support CSV export for approved inventory and review data.

Exports should include, as applicable:

- Use Cases and classifications.
- Templates and composite identities.
- Current Template Versions.
- Platform, Channel, Market, Tenant, and Sender data.
- Ownership and evidence status.
- Volumes and delivery outcomes.
- Mapping and approval status.
- Exception and ageing information.

Regulator response packs and advanced report builders remain roadmap capabilities.

## 10. Security, Privacy, and Governance Requirements

- Enforce role-based access and authorized data scope.
- Restrict sensitive content and show masked content by default.
- Minimize stored message content and PII.
- Preserve source lineage and explainability.
- Encrypt data in transit and at rest in the eventual system architecture.
- Apply configured retention rules to events while preserving required governance evidence.
- Record access and change activity where required by policy.
- Prevent self-approval for governed changes.

## 11. MVP Scope

The frontend MVP includes:

- Dashboard with core inventory and governance metrics.
- Use Case List and Use Case Detail.
- Template List and Template Detail.
- Template Version history and Candidate Version handling.
- Multi-dimensional search and filtering.
- Unmatched, candidate, and drift review workflows.
- Business Summary and Technical Details for AI Extraction Flow.
- Maker-checker Change Requests and Governance approval.
- Object, analysis, and approval history.
- CSV export.
- Mock data shaped like future API responses.

## 12. Post-MVP Roadmap

Post-MVP capabilities may include:

- Advanced custom reporting and regulator response pack generation.
- Visual matching-rule and policy-rule editors.
- Model operations and quality monitoring console.
- Automated low-risk approvals under defined policy.
- Advanced queue assignment and SLA orchestration.
- Broader platform and upstream-system ingestion.
- End-to-end request and message traceability.
- Enterprise attestation workflows and external system integrations.

## 13. MVP Success Measures

- At least 80% of in-scope production message volume is mapped to a Use Case candidate or approved Use Case.
- At least 70% of mapped Use Cases have confirmed owners in pilot markets.
- New unmatched traffic and unassigned Templates appear in Review Queue within 24 hours of ingestion.
- Every approved governed change has an identifiable Maker, Checker, timestamp, and before/after snapshot.
- Every AI-supported review decision retains a business explanation and accessible technical evidence.

## 14. Agreed Decisions

- Use Case is the parent of Template.
- A Use Case can contain multiple Templates.
- Use Cases, Templates, and Template Versions cannot be created manually; they originate from production discovery.
- Users may split system-generated Candidate Use Cases, but MVP does not allow splitting Active Use Cases.
- Template has its own List and Detail views.
- Template business identity is `Platform + Tenant/Workspace + Template ID`.
- Template also has a stable internal UUID.
- Material content changes under the same Template identity create a new Template Version.
- Regulatory, Servicing, and Marketing are classifications rather than primary inventory dimensions.
- Business and Governance users can modify governed objects.
- A centralized Governance Team performs approval.
- No user can approve their own change.
- AI Extraction Flow is retained inside object and review contexts with Summary and Technical Details views.
