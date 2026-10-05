 MASTER PROJECT PROMPT: Bhumi Sheba Shohayota Kendra (LSFC) Enterprise SaaS Platform
📌 Project Identity & Context
Project Name: Bhumi Sheba Shohayota Kendra Management System (LSFC-MS)
Project Type: Multi-tenant Enterprise SaaS Platform (Nationwide Scale)
Target Market: All Union, Pourashava (Municipality), Upazila Sadar, and City Corporation level LSFC centers across Bangladesh (potentially 10,000+ centers)
Governing Policy: "ভূমিসেবা সহায়তা নির্দেশিকা, ২০২৫" (Land Service Assistance Guideline 2025) issued by Ministry of Land, Government of People's Republic of Bangladesh
Primary Language: Bengali (বাংলা) for ALL user-facing content, UI, reports, receipts, and notifications
Theme Colors: Bangladesh Government Official Theme (Green #006A4E & Red #F42A41)
Business Model: Fixed-price Subscription SaaS (Monthly/Yearly)

🎯 Core Vision
Build a nationwide, enterprise-grade, subscription-based SaaS platform where thousands of licensed LSFC centers can digitally manage their complete land service operations, financial accounts, citizen requests, government reporting, staff management, and compliance workflows from a single unified multi-tenant system — while maintaining strict data isolation per center, blockchain-level immutable audit trails, hybrid cloud storage (Supabase + Google Drive), full offline capability, and 100% compliance with the Government of Bangladesh's Land Service Guideline 2025.

👥 User Roles & Hierarchy
1. Super Admin (Platform Owner - You)
Full control over entire platform
Manages all tenants (LSFC centers) nationwide
Controls global service toggles, pricing, CMS content, website pages
Approves edit/delete requests from centers
Views blockchain audit logs (immutable)
Configures central Google Drive and WhatsApp API
Manages subscriptions and billing
2. LSFC Owner / Center In-Charge (Tenant Admin)
Manages own center only (strictly RLS isolated)
Controls own staff, finances, reports, inventory
Can connect own Google Drive OR use platform's central drive
Approves staff edit requests before forwarding to Super Admin
Updates own agent service charges (within government-allowed limits)
Uploads digital signature (auto-inserted on receipts & reports)
3. Computer Operator / Staff
Daily data entry and citizen service delivery
Cannot delete anything (edit-request workflow only)
Role-based limited access set by Owner
Processes applications, collects fees, prints receipts
Works in offline mode when internet is unavailable
4. Citizen (Public View - No Login Required)
QR code receipt verification
Application status tracking (via tracking ID + mobile number)
Receives WhatsApp notifications
Public access to pricing, policies, user guides
🏗️ Technical Architecture
Tech Stack:
Frontend Framework: Next.js 14+ (React, App Router, TypeScript)
Version Control: GitHub
Hosting: Netlify (Frontend + Edge Functions)
Backend/Database: Supabase (PostgreSQL with Row Level Security)
Authentication: Supabase Auth + Custom Smart 2FA Logic
File Storage: Google Drive API (AES-256 Encrypted uploads, auto-organized)
Audit Trail: Blockchain Ledger (Immutable logs for IP/Device/Network)
Messaging: WhatsApp Business API (Primary) + SMS Gateway (Fallback)
Offline Support: Progressive Web App (PWA) with IndexedDB/Local Storage
State Management: Zustand
Styling: Tailwind CSS + shadcn/ui components
PDF Generation: react-pdf / puppeteer
QR Generation: qrcode.react
Charts: Recharts / Chart.js
Security Architecture (Multi-Layered):
SQL Injection Protection: Supabase ORM + PostgREST + Input Sanitization
XSS Protection: React's built-in escaping + Content Security Policy (CSP)
Row Level Security (RLS): Strict tenant isolation at PostgreSQL database level
2FA Authentication: Smart routing (TOTP priority over WhatsApp OTP for cost-saving)
Blockchain Audit: IP, Device fingerprint, Network ISP details stored immutably
Data Encryption: AES-256 for sensitive files on Google Drive
Encrypted File Naming: Original filenames replaced with hash (e.g., enc_8f9a2b1c3.pdf)
Auto Data Purge: Compliance with Policy Clause 11.6.10
CSRF Protection: Token-based verification
Rate Limiting: Prevent brute force attacks on login endpoints
New Device Alerts: Email/WhatsApp notification on new IP/device login
📂 Complete File Structure
text

lsfc-management-system/
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── security-scan.yml
│
├── public/
│   ├── favicon.ico
│   ├── manifest.json              # PWA manifest
│   ├── service-worker.js          # Offline support
│   ├── logo-govt.svg              # Bangladesh Govt logo
│   ├── logo-lsfc.svg              # LSFC center logo
│   └── locales/
│       └── bn.json                # Bengali translations (all UI text)
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/              # Public routes (no auth)
│   │   │   ├── page.tsx                     # হোম (Home)
│   │   │   ├── about/page.tsx               # আমাদের সম্পর্কে
│   │   │   ├── pricing/page.tsx             # মূল্য তালিকা
│   │   │   ├── faq/page.tsx                 # সাধারণ জিজ্ঞাসা
│   │   │   ├── user-guide/page.tsx          # ব্যবহার বিধি
│   │   │   ├── policies/page.tsx            # নীতিমালা
│   │   │   ├── privacy/page.tsx             # গোপনীয়তা নীতি
│   │   │   ├── terms/page.tsx               # শর্তাবলী
│   │   │   ├── contact/page.tsx             # যোগাযোগ
│   │   │   ├── services/page.tsx            # সেবা তালিকা
│   │   │   ├── track/[id]/page.tsx          # নাগরিক ট্র্যাকিং
│   │   │   └── verify/[qr]/page.tsx         # QR verification
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx               # লগইন
│   │   │   ├── register/page.tsx            # কেন্দ্র নিবন্ধন
│   │   │   ├── 2fa-verify/page.tsx          # ২এফএ যাচাই
│   │   │   ├── 2fa-setup/page.tsx           # ২এফএ সেটআপ
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   │
│   │   ├── superadmin/            # Super Admin Panel
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tenants/                     # কেন্দ্র ব্যবস্থাপনা
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── subscriptions/
│   │   │   ├── fee-management/              # সরকারি + এজেন্ট ফি
│   │   │   │   ├── license-fees/            # পরিশিষ্ট-৬
│   │   │   │   └── service-fees/            # পরিশিষ্ট-৭
│   │   │   ├── service-toggles/             # ফিচার টগল
│   │   │   ├── cms/                         # ওয়েবসাইট এডিটর
│   │   │   │   ├── pages/
│   │   │   │   ├── faq/
│   │   │   │   └── policies/
│   │   │   ├── notices/                     # সেন্ট্রাল নোটিশ
│   │   │   ├── analytics/                   # গ্লোবাল পরিসংখ্যান
│   │   │   ├── blockchain-logs/             # অডিট লগ ভিউয়ার
│   │   │   ├── edit-approvals/              # সংশোধন অনুমোদন
│   │   │   ├── drive-management/            # গুগল ড্রাইভ
│   │   │   ├── whatsapp-config/
│   │   │   ├── sms-config/
│   │   │   ├── security-monitor/
│   │   │   └── settings/
│   │   │
│   │   ├── owner/                 # LSFC Owner Panel
│   │   │   ├── dashboard/
│   │   │   ├── staff/                       # কর্মচারী ব্যবস্থাপনা
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── applications/
│   │   │   │   ├── pending/
│   │   │   │   ├── completed/
│   │   │   │   └── all/
│   │   │   ├── finance/
│   │   │   │   ├── income/
│   │   │   │   ├── expenses/                # ভাড়া, বিল, বেতন
│   │   │   │   ├── daily-closing/           # দৈনিক ক্যাশ ক্লোজিং
│   │   │   │   ├── net-profit/
│   │   │   │   └── reports/
│   │   │   ├── reports/
│   │   │   │   ├── monthly-govt/            # সরকারি মাসিক রিপোর্ট
│   │   │   │   ├── service-register/        # Policy 11.6.14
│   │   │   │   └── custom/
│   │   │   ├── license/                     # লাইসেন্স ট্র্যাকিং
│   │   │   │   ├── trade-license/
│   │   │   │   ├── dc-permit/               # ২ বছর মেয়াদ
│   │   │   │   └── renewal-reminder/
│   │   │   ├── inventory/                   # হার্ডওয়্যার
│   │   │   ├── subscription/                # SaaS সাবস্ক্রিপশন
│   │   │   ├── google-drive/                # নিজস্ব ড্রাইভ কানেক্ট
│   │   │   ├── signature/                   # ডিজিটাল স্বাক্ষর
│   │   │   ├── print-settings/              # রশিদ কাস্টমাইজ
│   │   │   ├── notice-board/                # স্টাফদের নোটিশ
│   │   │   ├── complaints/                  # অভিযোগ বক্স
│   │   │   ├── citizen-feedback/            # রেটিং ড্যাশবোর্ড
│   │   │   ├── self-audit/                  # পরিদর্শন চেকলিস্ট
│   │   │   ├── signboard-generator/         # Policy 11.6.7
│   │   │   ├── consent-form/                # নাগরিক সম্মতিপত্র
│   │   │   ├── audit-logs/                  # অপারেটর ট্র্যাকিং
│   │   │   ├── edit-requests/               # সংশোধন অনুরোধ
│   │   │   ├── offline-sync/
│   │   │   ├── agent-fee-update/            # নিজস্ব ফি আপডেট
│   │   │   └── settings/
│   │   │
│   │   ├── operator/              # Staff/Operator Panel
│   │   │   ├── dashboard/
│   │   │   ├── new-application/
│   │   │   │   ├── land-tax/                # ভূমি উন্নয়ন কর
│   │   │   │   ├── e-namjari/               # ই-নামজারি
│   │   │   │   ├── khatian/                 # খতিয়ান/পর্চা
│   │   │   │   ├── mouza-map/               # মৌজা ম্যাপ
│   │   │   │   ├── kabuliyat/               # কবুলিয়ত
│   │   │   │   ├── arpita-sampatti/         # অর্পিত সম্পত্তি
│   │   │   │   ├── porityakta-sampatti/     # পরিত্যক্ত সম্পত্তি
│   │   │   │   ├── sayrat-mahal/            # সায়রাত মহাল
│   │   │   │   ├── misc-case/               # মিসকেস
│   │   │   │   └── others/
│   │   │   ├── pending/
│   │   │   ├── completed/
│   │   │   ├── edit-requests/
│   │   │   ├── print-receipt/
│   │   │   ├── reprint-customer-copy/
│   │   │   ├── offline-queue/
│   │   │   ├── notifications/
│   │   │   └── profile/
│   │   │
│   │   └── api/                   # API Routes
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   ├── 2fa/
│   │       │   ├── totp-verify/
│   │       │   └── whatsapp-otp/
│   │       ├── payments/
│   │       │   ├── subscription/
│   │       │   └── service-fee/
│   │       ├── whatsapp/
│   │       │   ├── send-otp/
│   │       │   ├── send-notification/
│   │       │   └── send-receipt/
│   │       ├── sms/
│   │       ├── google-drive/
│   │       │   ├── upload/
│   │       │   ├── encrypt/
│   │       │   └── fetch/
│   │       ├── blockchain/
│   │       │   ├── log/
│   │       │   └── verify/
│   │       ├── pdf-generator/
│   │       │   ├── receipt/
│   │       │   ├── monthly-report/
│   │       │   ├── signboard/
│   │       │   └── consent-form/
│   │       ├── reports/
│   │       └── webhooks/
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── forms/
│   │   │   ├── ApplicationForm.tsx
│   │   │   ├── StaffForm.tsx
│   │   │   └── FeeUpdateForm.tsx
│   │   ├── tables/
│   │   ├── charts/
│   │   ├── modals/
│   │   ├── receipts/              # রশিদ টেমপ্লেট (Appendix-8)
│   │   │   ├── ThermalReceipt58mm.tsx
│   │   │   ├── ThermalReceipt80mm.tsx
│   │   │   └── A4HalfReceipt.tsx
│   │   ├── reports/
│   │   │   ├── MonthlyGovtReport.tsx       # সরকারি ফরম্যাট
│   │   │   ├── FinancialReport.tsx
│   │   │   └── ServiceRegister.tsx
│   │   ├── signboards/            # Policy 11.6.7
│   │   ├── layouts/
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── SuperAdminLayout.tsx
│   │   │   ├── OwnerLayout.tsx
│   │   │   └── OperatorLayout.tsx
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── LanguageToggle.tsx
│   │   │   └── OfflineIndicator.tsx
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       ├── TOTPSetup.tsx
│   │       └── WhatsAppOTPForm.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── middleware.ts
│   │   │   └── rls-policies.ts
│   │   ├── google-drive/
│   │   │   ├── upload.ts
│   │   │   ├── encrypt.ts
│   │   │   ├── folder-manager.ts
│   │   │   └── auto-organizer.ts
│   │   ├── blockchain/
│   │   │   ├── ledger.ts
│   │   │   ├── verify.ts
│   │   │   └── log-writer.ts
│   │   ├── 2fa/
│   │   │   ├── totp.ts            # Google Authenticator
│   │   │   ├── whatsapp-otp.ts
│   │   │   └── smart-router.ts    # TOTP > WhatsApp logic
│   │   ├── whatsapp/
│   │   │   ├── api-client.ts
│   │   │   └── templates.ts
│   │   ├── sms/
│   │   ├── encryption/
│   │   │   ├── aes-256.ts
│   │   │   └── file-hash.ts
│   │   ├── pdf/
│   │   │   ├── receipt-generator.ts
│   │   │   ├── report-generator.ts
│   │   │   └── signboard-generator.ts
│   │   ├── offline/
│   │   │   ├── storage.ts         # IndexedDB
│   │   │   ├── sync.ts
│   │   │   └── queue-manager.ts
│   │   ├── fees/
│   │   │   ├── calculator.ts      # 3-tier auto calc
│   │   │   └── validator.ts
│   │   ├── device-fingerprint/
│   │   └── utils/
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── use2FA.ts
│   │   ├── useRole.ts
│   │   ├── useOffline.ts
│   │   ├── useAuditLog.ts
│   │   ├── useBlockchain.ts
│   │   ├── useFeeCalculator.ts
│   │   └── useGoogleDrive.ts
│   │
│   ├── stores/                    # Zustand state
│   │   ├── authStore.ts
│   │   ├── centerStore.ts
│   │   ├── offlineStore.ts
│   │   └── settingsStore.ts
│   │
│   ├── types/
│   │   ├── user.ts
│   │   ├── center.ts
│   │   ├── application.ts
│   │   ├── transaction.ts
│   │   ├── report.ts
│   │   ├── blockchain.ts
│   │   └── service.ts
│   │
│   ├── constants/
│   │   ├── services.ts            # ১৫+ সেবার তালিকা
│   │   ├── fees.ts                # পরিশিষ্ট-৬ ও ৭
│   │   ├── license-fees.ts        # পরিশিষ্ট-৬
│   │   ├── service-fees.ts        # পরিশিষ্ট-৭ (14 services)
│   │   ├── routes.ts
│   │   ├── policies.ts            # নীতিমালা সংখ্যা
│   │   └── locations.ts           # Union/Pourashava/City Corp
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── bangla-fonts.css       # Bengali font support
│   │
│   └── middleware.ts              # Auth, RLS, Rate limiting
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_init_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_audit_tables.sql
│   │   ├── 004_blockchain_integration.sql
│   │   ├── 005_fees_structure.sql
│   │   └── 006_offline_sync_tables.sql
│   ├── functions/                 # Edge Functions
│   │   ├── send-whatsapp/
│   │   ├── sync-drive/
│   │   ├── generate-report/
│   │   ├── blockchain-log/
│   │   ├── auto-purge/            # Policy 11.6.10
│   │   └── fee-updater/
│   └── seed.sql
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   ├── BLOCKCHAIN.md
│   ├── FEES_STRUCTURE.md
│   └── USER_GUIDE_BN.md
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .env.local
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── netlify.toml
├── README.md
└── LICENSE
💰 Complete Fee Structure (As per Appendix-6 & Appendix-7)
🏷️ Appendix-6: License Fees (অনুমতিপত্র ফি)
Location Type	Fee (BDT)
Union Level (ইউনিয়ন পর্যায়ে - উপজেলা সদর ব্যতীত)	৳3,000
Upazila Sadar / Pourashava (উপজেলা সদর/পৌর এলাকা)	৳5,000
City Corporation (সিটি কর্পোরেশন এলাকা)	৳8,000
Note: Renewal fee is the same unless government revises it.

🏷️ Appendix-7: Service Delivery Fees (ভূমিসেবা সহায়তা প্রদান বাবদ ফি)
Total 14 Service Categories (৩-tier pricing):

#	Service Type	Union/Upazila Sadar	Pourashava (Except City Corp & Savar)	City Corp & Savar Pourashava
1	ভূমি উন্নয়ন কর/ভূমিসেবা নিবন্ধন (Land Dev Tax Registration)	৳50	৳50	৳50
2	ইউনিয়ন ভূমি অফিসের অনুমোদনের পরে ভূমি উন্নয়ন কর জমা বা আপত্তি দায়ের	৳20	৳20	৳20
3	করদাতাকে দাখিলার প্রিন্ট কপি সরবরাহ	৳20	৳20	৳20
4	নামজারি মামলা দায়েরের অনলাইন আবেদন (স্ক্যান পৃষ্ঠা ২০+ হলে প্রতি পৃষ্ঠায় ৳3 অতিরিক্ত)	৳200	৳250	৳300
5	নামজারি ফি জমাকরণ ও অনলাইন খতিয়ান প্রিন্ট সরবরাহ	৳100	৳100	৳100
6	নামজারি খতিয়ান/রেকর্ডীয় খতিয়ান/পর্চা প্রাপ্তির অনলাইন আবেদন	৳100	৳120	৳150
7	নকশা মাধ্যমে খাস কৃষি জমির অবস্থা প্রদর্শন, বন্দোবস্তের আবেদন	৳100	৳120	৳120
8	কবুলিয়ত ফরম পূরণ ও সহকারী কমিশনার (ভূমি) বরাবর দাখিল	৳80	৳80	৳80
9	অর্পিত সম্পত্তি লিজ/নবায়ন আবেদন পূরণ ও দাখিল	৳100	৳120	৳150
10	পরিত্যক্ত সম্পত্তি লিজ/ভাড়ার আবেদন পূরণ ও দাখিল	৳100	৳120	৳150
11	সায়রাত মহাল লিজ সংক্রান্ত আবেদন পূরণ ও দাখিল, লিজ মানি জমা	৳100	৳120	৳150
12	মৌজা ম্যাপ বা নকশার আবেদন প্রস্তুত, দাখিল ও ফি জমা, গ্রহণ ও বিতরণ	৳100	৳120	৳150
13	বিভিন্ন প্রকারের মিস কেস আবেদন প্রস্তুত, কাগজাদি আপলোড ও দাখিল	৳100	৳120	৳150
14	সরকার কর্তৃক প্রদত্ত বা অনুমোদনকৃত অন্য কোন অনলাইন ভূমিসেবা প্রদান	Govt-defined	Govt-defined	Govt-defined
Additional Rules:

দ্বিতীয় বা এর অধিক কপি প্রিন্টের জন্য প্রতি কপি ৳20 সহায়তাকারী কর্তৃক আদায়যোগ্য
Government may revise all fees via circular (Super Admin updates globally)
⚙️ Complete Feature List (Finalized)
🔱 SUPER ADMIN FEATURES
Tenant Management: Create, approve, suspend, or block LSFC centers nationwide
Master Fee Configuration: Update government fees & agent service charges globally (14 services × 3 tiers = 42 fee combinations per Appendix-7)
License Fee Management: Update Appendix-6 fees (3 tiers)
Service Feature Toggle: Hidden ON/OFF switches for each of 14 government services (invisible to others)
Subscription Management: Fixed monthly/yearly pricing control, payment tracking, auto-suspension
Dynamic CMS: Live edit homepage, FAQ, pricing, policies, user guide, terms, privacy (publish/draft system)
Central Notice Board: Push notices to all centers' dashboards simultaneously
Global Analytics Dashboard: Nationwide statistics, district-wise performance, service-wise analytics
WhatsApp API Configuration: Setup Business API credentials
SMS Gateway Configuration: Fallback messaging setup
Google Drive Master Configuration: Connect central drive for file storage
Blockchain Audit Trail Viewer: View immutable IP/Device/Network logs
Edit/Delete Approval Center: Review and approve data modification requests
Security Monitoring: SQL injection attempts, suspicious activity alerts
Element-wise Page Editor: Edit every text/element on public pages
🏢 LSFC OWNER FEATURES (22+ Features)
Smart Overview Dashboard: Daily/monthly income, applications, govt fees, agent profit (real-time graphs & charts)
Staff & Operator Management: Create accounts, assign roles, monitor performance, biodata entry
One-Click Monthly Govt Report (PDF): Auto-generate official format for AC Land/DC office (as per sample image provided)
Center Profile & License Tracking: DC approval letter (Form-2), 2-year countdown, renewal reminders
Subscription & Billing: View fixed fee, payment history, download vouchers
Google Drive Status: Backup logs, encryption status, option to connect own drive OR use central drive
Digital Service Register & Complaint Box: Policy 11.6.14 compliance
WhatsApp & Notification Logs: Delivery status, resend options
Hardware & Inventory Register: Prep for Govt inspection (Form-5)
Service Fee Viewer: All 14 services as per Appendix-7 (3-tier)
Income-Expense Tracker: Rent, electricity, internet, salary → Net profit calculation
Daily Cash Closing & Settlement: Match cash + MFS (bKash/Nagad) with operators
Auto Rate Chart & Signboard Generator: Policy 11.6.7 compliance (print-ready)
Citizen Consent Form Generator: Policy 11.6.6 compliance (digital)
Self-Audit Checklist: Policy 11.8 (Form-5) inspection preparation
Citizen Rating & Feedback Dashboard: Policy 11.3.7 compliance (star rating analytics)
Operator Audit Trail: Detailed logs with IP tracking (view blockchain logs)
Manual Sync & Offline Backup Control: Monitor pending syncs
Staff Notice Board: Internal messaging to operators
Receipt & Printer Setup: Customize paper size (58mm/80mm thermal, half A4), add logo, phone, custom message
Digital Signature Upload: Auto-insert on receipts, statements, reports (saves manual signing time)
Agent Fee Update Permission: Update own agent service charges (within govt-allowed limits)
Edit/Delete Request Approval: Approve staff correction requests before forwarding to Super Admin
Staff Biodata Management: Full employee profile with NID, photo, electric signature
👨‍💻 OPERATOR/STAFF FEATURES
Secure Login: User ID/Password + 2FA (optional per owner setting)
Daily Task Dashboard: Personal daily applications & revenue
Smart & Fast Data Entry Forms: Separate forms for all 14 services
Auto Fee Calculation: Based on center location (Union/Pourashava/City Corp) and service type
Auto Google Drive Folder Assignment: No manual file management needed
One-Click Smart Print: Customer copy only with auto-inserted owner signature
Office Copy Digital Storage: No paper waste, only customer copy prints
Correction Request Panel: No delete button, only edit-request workflow
Pending File Tracking: Service-ready SMS/WhatsApp notifications
Offline Entry Mode: Local browser storage (IndexedDB) with auto-sync
Receipt Reprint (Customer Copy Only): Office copy stays digital forever
Service Status Updates: Mark pending → in-progress → completed
🌐 PUBLIC/CITIZEN FEATURES
Full Bengali Website: Home, Pricing, FAQ, User Guide, Policies, Privacy, Terms, Contact, About, Services
QR Code Receipt Verification: Scan to verify authenticity & payment status
Live Application Tracking: Tracking ID + mobile number
WhatsApp Notifications: Application status, ready-to-collect alerts, receipt copy
🔐 Security & Compliance Rules
Immutable Data Policy:
No Delete Function Anywhere: Nothing can be deleted directly from any panel
Edit Approval Workflow: Operator → Owner → Super Admin approval chain
Blockchain Logs: All IP, device fingerprint, network ISP details stored on blockchain ledger (unchangeable even by Super Admin)
Invoice/Receipt Lock: Once generated, invoices cannot be modified without multi-level approval
2FA Smart Routing Logic:
text

IF user has Google Authenticator (TOTP) setup:
    → Use TOTP ONLY (NO WhatsApp OTP sent, saves API cost)
ELSE:
    → Fallback to WhatsApp OTP
    → Secondary fallback: SMS OTP (if WhatsApp fails)
Mandatory 2FA Roles:
Super Admin: ALWAYS Mandatory
LSFC Owner: ALWAYS Mandatory
Operator: Optional (Owner decides)
Data Storage Rules:
Text Data: Supabase PostgreSQL (with RLS)
Files/PDFs/Images (NID, Khatian, etc.): Google Drive (AES-256 Encrypted, auto-organized by Center/Year/Month/Service)
Audit Logs: Blockchain Ledger (Immutable - IP, Device, Network)
File Naming: Encrypted hash names (e.g., enc_8f9a2b1c3.pdf instead of nid_rahim.pdf)
Google Drive Folder Structure:
text

[LSFC Main Root Folder (Super Admin or Own)]
  ├── [Center_ID_101 (ঠাকুরগাঁও সদর)]
  │     ├── [2025]
  │     │     ├── [05-May]
  │     │     │     ├── [E-Namjari] → enc_xyz.pdf
  │     │     │     ├── [Land_Tax]
  │     │     │     ├── [Khatian]
  │     │     │     ├── [Mouza_Map]
  │     │     │     ├── [Kabuliyat]
  │     │     │     └── [Misc_Case]
  │     └── [Monthly_Reports] → Auto-generated PDF reports
  └── [Center_ID_102]
Compliance with Govt Policy "ভূমিসেবা সহায়তা নির্দেশিকা, ২০২৫":
Policy 11.6.10: Auto data purge after service completion period
Policy 11.6.14: Digital service register maintenance
Policy 11.6.7: Signboard and rate chart display (auto-generated)
Policy 11.6.6: Citizen consent form for representative applications
Policy 11.3.7: Citizen rating collection (monthly/quarterly/yearly)
Policy 11.8 (Form-5): Inspection form compatibility (self-audit)
Appendix-1 (Form-1): License application form
Appendix-2 (Form-2): License certificate format
Appendix-3 (Form-3): Public notification format
Appendix-4 (Form-4): Application evaluation form
Appendix-5 (Form-5): Inspection form
Appendix-6: 3-tier license fees (৳3,000/৳5,000/৳8,000)
Appendix-7: 14-service fee structure (3-tier pricing)
Appendix-8: Standard receipt format with QR code
🚀 Development Phases
Phase 1 (MVP - 4-6 weeks):
Authentication & Smart 2FA (TOTP + WhatsApp)
Multi-tenant Supabase setup with RLS
Super Admin basic panel (tenant management)
LSFC Owner basic dashboard
Operator basic entry forms (3-5 services)
Receipt printing (thermal 58mm/80mm)
Full Bengali UI
Phase 2 (Core Features - 4-6 weeks):
All 14 services with 3-tier fee calculation
Google Drive integration with encryption
Offline mode (PWA + IndexedDB)
WhatsApp OTP & notification integration
Monthly government report auto-generator
Digital signature upload & auto-insertion
Phase 3 (Advanced Features - 4-6 weeks):
Blockchain audit trail integration
Edit/Delete approval workflow
CMS for dynamic page editing
Advanced analytics dashboards
Self-audit checklist
Signboard/rate chart generator
Phase 4 (Compliance & Polish - 3-4 weeks):
Full policy compliance verification
Public tracking & QR verification
Citizen rating system
Complaint management
Performance optimization
Security hardening & penetration testing
Phase 5 (Launch & Scale - Ongoing):
Beta testing with pilot centers
Documentation finalization
Training materials in Bengali
Nationwide rollout
Continuous feature updates
📝 Current Project Status
Status: [UPDATE THIS SECTION IN EACH NEW CHAT]

Example: "Currently working on: Phase 1 - Supabase schema design & RLS policies"
Example: "Completed: Login UI, Smart 2FA setup. Next: Operator dashboard with 14 services"
Example: "Blocked on: Google Drive API integration — need help with encryption workflow"
🎯 Instructions for AI Assistant
When continuing this project in a new chat:

Read the entire master prompt first before suggesting anything
Respect Bengali language for ALL user-facing UI text, reports, receipts, notifications
Maintain Bangladesh Govt theme (Green #006A4E & Red #F42A41)
Follow the exact file structure above — do not deviate
NEVER suggest DELETE functionality — ALWAYS use edit-approval workflow
Prioritize TOTP over WhatsApp OTP for 2FA (cost-saving critical)
All sensitive data MUST be encrypted and audit-logged to blockchain
Strict RLS enforcement for multi-tenant isolation (one center NEVER sees another's data)
Comply with ALL clauses of Govt Policy "ভূমিসেবা সহায়তা নির্দেশিকা, ২০২৫"
Always calculate fees based on center location type (Union/Pourashava/City Corp)
All 14 services from Appendix-7 must be supported with correct 3-tier pricing
Ask for current progress status before suggesting next steps
Consider rural internet conditions — offline-first is non-negotiable
Customer copy prints only — office copy stays digital forever (paper savings)
Receipt customization (58mm/80mm/A4 half) is mandatory for printer flexibility
Digital signature must auto-insert on receipts, statements, monthly reports
Google Drive folder structure must follow: Center_ID → Year → Month → Service
File names on Drive MUST be encrypted hashes (e.g., enc_xxx.pdf)
Blockchain logs capture: IP, Device fingerprint, Network ISP, Timestamp
Super Admin has override on everything EXCEPT blockchain logs (truly immutable)
📌 Critical Notes:

This is a nationwide critical infrastructure project potentially serving 10,000+ LSFC centers
Prioritize security, compliance, and reliability over feature speed
Every decision must consider: rural internet conditions, government inspection readiness, prevention of data misuse, and cost-efficiency for centers
The platform must be 100% compliant with Govt Policy 2025 to be legally operable
Think long-term scalability: millions of transactions per day across thousands of centers
END OF MASTER PROMPT
