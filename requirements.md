Requirements + MVP/Roadmap

1) Tool purpose (what it must achieve)

Create and maintain a Group messaging inventory by automatically discovering and matching outbound messages from production logs (MDP, SFMC, ICCM, IRIS) into use cases, with human validation and an audit trail, so we can answer: what is live, who owns it, what is being sent, and can we evidence control.

2) Requirements (what the tool must do)

A. Data ingestion (must)

Ingest production logs from MDP, SFMC, ICCM, IRIS (batch + near real-time acceptable for MVP).
Support multiple formats (CSV export, API, log streams) and maintain source lineage.
Store only what’s needed; support PII minimisation (prefer metadata + hashed content).
B. Extraction (must)

From logs, extract and normalise:

Channel (SMS/email/push/in-app where available)
Platform (MDP/SFMC/ICCM/IRIS), tenant/workspace/sending profile
Timestamp, message IDs, correlation IDs (if present)
Sender identity (SMS sender ID/short code; email From domain/address; reply-to)
Template reference (AEM/MDP template ID; SFMC asset ID; ICCM template ID)
Delivery outcomes (sent/delivered/bounced/failed where available)
Volume metrics (daily/monthly aggregates)
C. Use case matching & clustering (must)

Group message events into candidate use cases using deterministic rules first (template ID + sender + tenant/workspace), then clustering (content fingerprint + metadata).
Produce a confidence score per match and per inferred attribute.
Detect drift: “inventory says retired but logs show live”, “new sender ID appears”, “new template appears”.
D. Classification (should for MVP; must for later)

Suggest message type: Regulatory / Servicing / Marketing with confidence.
Flag presence of URLs/domains and contact numbers in content (or via template metadata).
(Later) flag potential non-compliance patterns (e.g., public URL shorteners) aligned to policy.
E. Ownership workflow (must)

Provide a triage queue for markets/LoBs to:
confirm/rename use case,
assign Message Owner + Integrating System Owner,
confirm classification,
link evidence (approval/attestation references).
Maker-checker support and full audit trail of changes.
F. Reporting & export (must)

Inventory export (CSV) and dashboards:
% traffic matched to inventory (coverage)
unknown/unmatched traffic list + ageing
volume by market/LoB/channel/platform
top sender IDs/domains/templates
“Regulator response pack” export: list of all messages to a market/channel with owners and sender identities.
G. Security & compliance (must)

Role-based access; restricted access to any content snippets.
Data retention aligned to records policy; encryption at rest/in transit.
Explainability: store why a match was made (rules hit / cluster ID).
H. Dependencies / constraints (explicit)

Tool will initially cover Messaging-owned platforms only; DSP/CIB etc. require onboarding feeds.
“Upstream system” attribution is only reliable if logs include an upstream identifier; otherwise it remains “unknown” until a metadata standard is enforced.
3) MVP definition (what “MVP” means)

MVP outcome: For Messaging-owned platforms (MDP/SFMC/ICCM/IRIS), the tool can produce a use case-level inventory with:

channel, market/entity, platform, sender identity, template link, monthly volume, delivery outcomes (where available),
confidence scoring,
triage workflow to confirm owners and classification,
exportable inventory and exception list.
MVP success metrics

≥80% of message volume on in-scope platforms mapped to candidate use cases
≥70% of mapped use cases have confirmed owners in pilot markets
Unknown traffic list produced automatically within 24 hours of log ingestion
4) Roadmap (phased delivery)

Phase 0 — Mobilise & design (Weeks 0–4)

Confirm scope, data sources, privacy model, and MVP schema
Define matching rules + confidence scoring approach
Define triage workflow, maker-checker, and audit trail requirements
Deliverables: signed requirements, data contracts, MVP schema, pilot market selection
Phase 1 — MVP build + pilot (Weeks 5–12)

Ingest logs from MDP + one legacy platform (e.g., SFMC) for 2–3 pilot markets
Implement extraction + deterministic matching + basic clustering
Build triage queue + CSV export + coverage dashboard
Deliverables: MVP tool live for pilots; first inventory baseline; unknown traffic report
Exit KPI: ≥80% volume matched in pilot scope
Phase 2 — Expand coverage + classification (Weeks 13–24)

Add remaining Messaging-owned platforms (ICCM, IRIS)
Add classification suggestions (regulatory/servicing/marketing) + URL/domain detection
Add drift detection + ageing SLAs for unknowns
Deliverables: multi-platform inventory; exception management process; policy-aligned flags
Exit KPI: ≥90% volume matched across in-scope platforms
Phase 3 — End-to-end traceability (Weeks 25–36)

Implement/consume standard upstream identifiers (where available)
Correlate upstream request IDs ↔ messaging platform IDs ↔ vendor IDs
Improve retry/fallback visibility (where applicable)
Deliverables: upstream attribution for real-time traffic; traceability reporting
Exit KPI: ≥90% of real-time traffic has upstream attribution in pilot markets
Phase 4 — Scale beyond Messaging-owned platforms (Weeks 25–52, parallel)

Onboard DSP/CIB etc. via minimum telemetry feeds (daily export/API)
Until onboarded, enforce procedural registration + quarterly attestation via FIM
Deliverables: expanded enterprise coverage; reduced “unknown source” risk
Phase 5 — BAU hardening (post-52 weeks)

Performance, resilience, access recertification, automated governance reporting
Integration with Workbench/EMI as system-of-record and attestation workflow