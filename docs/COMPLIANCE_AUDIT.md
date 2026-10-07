# LSFC requirements and policy compliance audit

Date: 06 October 2026

## Scope and legal caveat

This review checks the repository against the master requirements recorded in `README.md` and the cited clauses of “ভূমিসেবা সহায়তা নির্দেশিকা, ২০২৫”. The official gazetted full text and supplied sample forms are not present in the repository, and an authoritative copy could not be located from the Ministry’s publicly indexed pages during this review. Therefore, this is an engineering conformance review, not a legal certification. The final forms, retention period, wording, and fee circular must be signed off by the Ministry/DC office before production.

## Implemented and code-verified

| Area | Status | Evidence |
|---|---|---|
| Tenant isolation | Implemented | RLS enabled and forced on all 58 application tables; tenant policies and scoped RPCs |
| No direct deletion | Implemented | No product delete action; immutable triggers and forward-only correction/reversal workflows |
| Mandatory AAL2 | Implemented | Super Admin and Owner mandatory; Operator policy controlled per Center |
| Center lifecycle | Implemented | Pending/Active/Suspended/Blocked transitions and inactive operational gate |
| Appendix-6 fees | Corrected | Union ৳3,000; Upazila Sadar/Pourashava ৳5,000; City Corporation/Savar ৳8,000 |
| Appendix-7 fees | Implemented | 14 services, location-tier fees, mutation extra-page fee, global revisions |
| Receipts | Implemented | Immutable/versioned customer copy, QR verification, Owner-selected 58mm/80mm/Half-A4 defaults, safe text preferences, encrypted versioned Center logo, digital signature, and immutable copy ledger (first copy free; later copies ৳20) |
| Correction chain | Implemented | Operator → Owner → Super Admin, versioned application and receipt |
| Subscription | Implemented | Monthly/yearly pricing, immutable payments, overdue enforcement workflow |
| Reports | Implemented | Closed-month snapshots, service/fee/expense totals, SHA-256, Print/PDF, signature snapshot |
| Dashboard charts | Implemented | Live 14-day application/completion/value trends, role-scoped nationally, per Center, or per Operator; accessible data table fallback |
| Policy 11.6.6 | Implemented | Per-application printable citizen consent form and consent flag |
| Policy 11.6.7 | Implemented | Location-aware printable rate chart and Center signboard |
| Policy 11.6.14 | Implemented | Digital application/service register and complaint register |
| Policy 11.3.7 | Implemented | One verified feedback per completed application and Owner rating view |
| Public service fees | Implemented | Public, database-backed Bengali catalogue for all active Appendix-7 services and location tiers |
| Owner audit visibility | Implemented | Tenant-scoped view of the latest immutable operator/system activity records |
| Center staff notices | Implemented | Owner-published Center-only notices, immutable versions, scheduled visibility, and Operator board |
| Password recovery | Implemented | Enumeration-safe Supabase recovery, allowlisted callback, password reset, privacy-bounded administrative review, and audited decisions |
| Operator least privilege | Implemented | Owner-managed per-Operator create, status, receipt-print, and correction permissions enforced by database triggers |
| Staff records | Implemented | Tenant-scoped biodata, append-only attendance and performance-review history, plus encrypted NID/photo/signature storage |
| Policy 11.8 / Form-5 readiness | Implemented foundation | Compliance checklist, assets, immutable self-audit snapshot |
| Audit ledger | Implemented | Serialized per-Center SHA-256 chains, immutable rows, verifier, IP and User-Agent capture |
| Encrypted signature | Implemented | AES-256-GCM Google Drive storage and hashed filename |
| Encrypted application files | Implemented foundation | Validated PDF/images, AES-256-GCM, hashed names, immutable metadata, tenant RLS, Center/Year/Month/Service hierarchy, compensating deletion, and an audited reconciliation queue |
| CMS/notices | Implemented | Draft/publish revisions, allowlisted element-level heading/paragraph/callout/link blocks, safe rendering, and role/audience-aware notices |
| PWA safety | Implemented foundation | Manifest and public fallback; authenticated and citizen data explicitly not cached |
| Account lifecycle | Implemented | Public registration intake with AAL2 review, seven-day Owner/Operator invitations, acceptance, pre-acceptance revocation, Auth banning, and administrative recovery review |
| PDF archives | Implemented foundation | Owner/Operator-exported finalized report and receipt PDFs, validated, AES-256-GCM encrypted, immutable metadata, tenant RLS, protected download, and durable failed-rollback reconciliation |
| Messaging outbox | Implemented foundation | Idempotent application events, immutable delivery attempts, bounded retries, stale-claim recovery, dead-letter requeue, tenant-scoped Owner history, and AAL2 monitoring; provider delivery is not connected |
| License reminders | Implemented foundation | Secret-protected idempotent scheduler endpoint with no assumed day offsets; approved schedule, production scheduler, templates, and delivery worker remain external |
| CI/release | Implemented | Static migration checks, 59 policy/security/accessibility regression tests, lint, build, full production/development dependency audit, Netlify hardening, health/readiness, deployment runbook |

## Partial requirements requiring additional work

1. **Policy 11.6.10 retention/purge:** no authoritative retention duration or exact purge scope exists in the repository. Citizen PII is currently retained in immutable receipts and reports. Do not invent or activate a purge duration until the signed policy specifies which fields and records must be erased, anonymized, or retained.
2. **True offline entry and auto-sync:** application intake now has an allowlisted, device-bound IndexedDB queue using non-extractable AES-GCM keys, fresh idempotent request IDs, automatic online-event sync, metadata-only failed-item visibility, explicit retry, and confirmed local-draft discard; the service worker still refuses authenticated/PII caching. Cross-device conflict handling, key recovery, privacy-approved Owner device-sync monitoring, and browser E2E remain incomplete.
3. **Application document storage:** PDF/image application attachments (including NID, khatian, map, and supporting documents) now use AES-256-GCM, hashed names, immutable metadata, the Center → Year → Month → Service Drive hierarchy, and compensating deletion if database registration fails. Per-Center OAuth choice, malware scanning, and automatic server-side monthly-PDF generation remain incomplete. Browser-exported finalized PDFs can now enter the encrypted archive, and failed compensating deletions enter an audited Super Admin reconciliation queue.
4. **Messaging delivery:** application lifecycle events now enter an idempotent, tenant-scoped provider-neutral outbox; immutable attempt history, exponential retry state, stale-claim recovery, dead-letter state, an AAL2 Super Admin requeue view, and tenant-scoped Owner delivery-history visibility exist. No worker renders or sends these events yet: approved WhatsApp/SMS templates, provider credentials, delivery adapters, fallback policy, and webhook verification remain required. OTP fallback is also not wired to an identity provider.
5. **Smart 2FA fallback:** TOTP is implemented and mandatory for privileged roles. WhatsApp OTP then SMS OTP fallback is not wired to an identity provider.
6. **Owner-managed service charge:** Super Admin controls the global Appendix-7 catalogue. A separate government-approved min/max band and Owner override workflow is not implemented because legal limits are not supplied.
7. **Government fees:** Operator records actual government portal fees per application. A global government-fee catalogue cannot be safely added until authoritative fixed/variable rules per service are supplied.
8. **Owner Drive choice:** central encrypted Drive is supported; per-Center OAuth/Drive selection and backup log UI are not.
9. **Audit device/network enrichment:** IP and User-Agent are captured. Reliable device identity and ISP/network enrichment need a privacy-approved trusted service; browser-supplied values must not be treated as authoritative.
10. **Security telemetry:** integrity and integration failures are captured. Edge/WAF rate limiting, SQL-injection telemetry, failed-login monitoring, and new-device alerts require deployment infrastructure.
11. **Official forms:** Form-1 through Form-5 exact layouts cannot be certified without the referenced official samples.
12. **Owner report signature history:** new reports snapshot the current signature after migration 028. Reports generated before that migration naturally have no signature snapshot.
13. **Bengali-only UI:** a repository-wide Bengali copy pass translated core authentication, citizen, operational, administration, notice, review, and security labels. A smaller set of finance, provider/acronym, and technical-state terms still requires a formal translator/content-owner review before public launch.
14. **Public website content:** public navigation, a live 14-service fee catalogue, and CMS routes exist. About, Contact, FAQ, Guide, Policy, Privacy, and Terms still require approved Bengali copy to be authored and published through CMS.
15. **License evidence and reminders:** license status, number, expiry, renewal request, and review exist. Encrypted, immutable Form-2/DC-letter/current-license evidence upload and Super Admin review are implemented. A secret-protected, idempotent scheduling endpoint can enqueue reminders only for externally approved day offsets; production scheduler configuration and actual provider delivery remain incomplete.
16. **Automated payment collection:** immutable subscription payment/voucher records exist; no live payment-gateway checkout, webhook verification, refund/reversal provider flow, or automated reconciliation is connected.
17. **PDF and statement archival:** finalized report and receipt PDFs can now be exported by the browser, validated, AES-256-GCM encrypted, archived under the Center/Year/Month/Archives Drive hierarchy, and downloaded through tenant guards. Fully automatic server-side PDF generation/archival remains incomplete.
18. **Automated test depth:** 59 policy/security/accessibility regression tests now enforce migration continuity, forced RLS, pinned security-definer search paths, non-destructive SQL, Appendix-6/7 fees, receipt-copy rules, protected-page authorization, sensitive-download guards, and browser endpoint safety in CI. Static keyboard, language, focus, reduced-motion, and navigation checks now run in CI. Live database integration, tenant-adversarial, browser E2E with an accessibility engine, assistive-technology review, and load suites are still required.
19. **Production resilience:** the deployment runbook and Netlify build/security-header configuration exist, but point-in-time recovery drills, disaster recovery objectives, queue monitoring, and scheduler failover are not runtime-verified.
20. **Nationwide scale evidence:** indexes and aggregate RPCs exist, but the stated 10,000+ Center / high-volume target has not been demonstrated with load, concurrency, query-plan, storage, and cost tests.

### Remaining-work count

There are **20 tracked open or partial requirement groups** above. This is a scope count, not a percentage-complete claim: several groups are large integrations. At least retention/purge, fee-limit rules, fixed government-fee rules, official Forms 1–5, approved Bengali legal copy, messaging templates, and privacy/device-network handling require authoritative external decisions or documents before safe implementation. Live messaging, payment, Drive, scheduler, staging migration, and scale verification additionally require provider credentials/infrastructure.

## Release blockers

- Apply and runtime-test migrations 001–049 against a real Supabase staging project.
- Obtain Ministry/DC legal sign-off for fees, form wording, retention, consent, and signboard dimensions.
- Configure SMTP, public URL, provider credentials, encrypted Drive, and an approved scheduler.
- Perform RLS adversarial tests with separate Super Admin, two Centers, Owners, and Operators.
- Perform load and index tests using nationwide-scale synthetic data.
- Complete a DPIA/privacy review for citizen PII, audit IP data, and third-party messaging/storage.

The platform must not be represented as “100% government certified” until all partial items and release blockers above are closed with documentary evidence.
