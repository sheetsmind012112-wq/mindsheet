# SheetMind — Implementation Checklist

> Auto-generated from PRD v1.0. Tick boxes as each item is completed.

---

## Stage 1: Foundation (Database + Auth)

### 1.1 Database Setup (Supabase)

- [x] Create `users` table
  - [x] `id` UUID primary key (default `gen_random_uuid()`)
  - [x] `email` VARCHAR(255), unique, indexed
  - [x] `name` VARCHAR(255)
  - [x] `google_id` VARCHAR(255), unique, indexed
  - [x] `avatar_url` VARCHAR(500), nullable
  - [x] `tier` ENUM (`free`, `pro`, `team`), default `free`
  - [x] `stripe_customer_id` VARCHAR(255), nullable
  - [x] `stripe_subscription_id` VARCHAR(255), nullable
  - [x] `created_at` TIMESTAMPTZ, default `now()`
  - [x] `updated_at` TIMESTAMPTZ, default `now()`
- [x] Create `conversations` table
  - [x] `id` UUID primary key
  - [x] `user_id` UUID FK → users (cascade delete), indexed
  - [x] `title` VARCHAR(500), default `'New Conversation'`
  - [x] `created_at`, `updated_at` timestamps
- [x] Create `messages` table
  - [x] `id` UUID primary key
  - [x] `conversation_id` UUID FK → conversations (cascade delete), indexed
  - [x] `role` ENUM (`user`, `assistant`)
  - [x] `content` TEXT
  - [x] `confidence_score` FLOAT, nullable
  - [x] `sources` JSONB, nullable (format: `{"label","sheet","range"}`)
  - [x] `created_at`, `updated_at` timestamps
- [x] Create `usage_records` table
  - [x] `id` UUID primary key
  - [x] `user_id` UUID FK → users (cascade delete), indexed
  - [x] `period` DATE, indexed
  - [x] `query_count` INT default 0
  - [x] `formula_count` INT default 0
  - [x] `chat_count` INT default 0
  - [x] `created_at`, `updated_at` timestamps
- [x] Enable Row Level Security (RLS) on all tables
- [x] Add RLS policies (users can only access own data)
- [x] Verify tables via `list_tables` MCP call
- [x] Run Supabase security advisor check

### 1.2 Authentication — Google OAuth 2.0 (via Supabase Auth)

- [x] Register Google Cloud OAuth 2.0 credentials (Client ID + Secret)
- [x] Add redirect URI to Google Console
- [x] Configure Google provider in Supabase Dashboard
- [x] Implement `GET /api/auth/login`
  - [x] Return Supabase OAuth URL for Google login
  - [x] Redirect to frontend after auth
- [x] Implement `POST /api/auth/callback`
  - [x] Exchange Supabase tokens (access_token + refresh_token)
  - [x] Upsert user in `users` table (create on first login)
  - [x] Return user profile + tokens
- [x] Implement `POST /api/auth/refresh`
  - [x] Validate refresh token via Supabase
  - [x] Issue new access token
- [x] Implement `GET /api/auth/me`
  - [x] Return current user profile (requires auth)
- [x] Implement `POST /api/auth/logout`
  - [x] Client-side token clearing

### 1.3 Auth Middleware & Guards

- [x] Create `get_current_user` dependency (validates Supabase JWT)
- [x] Create `require_tier()` dependency for tier-gated endpoints
- [x] Add auth middleware to all protected routes (chat, formula, usage)
- [x] Handle expired token responses (401)
- [x] Handle insufficient tier responses (403)

### 1.4 Configuration & Environment

- [x] Verify all env vars are documented and loaded:
  - [x] `SUPABASE_URL`
  - [x] `SUPABASE_ANON_KEY`
  - [x] `SUPABASE_SERVICE_ROLE_KEY`
  - [x] `GOOGLE_CLIENT_ID`
  - [x] `GOOGLE_CLIENT_SECRET`
  - [x] `GOOGLE_REDIRECT_URI`
  - [x] `JWT_SECRET_KEY`
  - [x] `JWT_ALGORITHM` (default HS256)
  - [x] `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`
  - [x] `JWT_REFRESH_TOKEN_EXPIRE_DAYS`
  - [x] `OPENAI_API_KEY`
  - [x] `ANTHROPIC_API_KEY`
  - [x] `STRIPE_SECRET_KEY`
  - [x] `STRIPE_WEBHOOK_SECRET`
  - [x] `REDIS_URL`
- [x] Create `.env.example` with all keys (no values)

---

## Stage 2: Core Chat Feature (P0)

### 2.1 AI Provider Integration (via OpenRouter)

- [x] Create `app/services/ai_provider.py`
- [x] Implement OpenRouter-based chat completion (OpenAI-compatible client)
  - [x] System prompt engineering (spreadsheet analysis context)
  - [x] Pass sheet data as context in user message
  - [ ] Handle streaming responses (optional Phase 1)
  - [x] Parse and return structured response
- [x] Implement model failover (primary → fallback via OpenRouter)
  - [x] Primary: `openai/gpt-4`
  - [x] Fallback: `anthropic/claude-sonnet-4-20250514`
  - [x] Auto-switch on primary failure
- [x] Error handling for API failures (rate limits, timeouts, invalid responses)

### 2.2 Confidence Score Algorithm

- [x] Create `app/services/confidence.py`
- [x] Implement scoring factors:
  - [x] Data completeness — % of non-empty cells in referenced range
  - [x] Data volume — row count scoring
  - [x] Calculation complexity — simple lookup vs multi-step analysis
  - [ ] AI model uncertainty — token log-probabilities (future enhancement)
  - [ ] Historical accuracy — user feedback correlation (placeholder for v1)
- [x] Combine factors into 0-100 score (weighted average)
- [x] Map score to tier: Green (90-100), Yellow (70-89), Red (<70)
- [x] Return score + tier + breakdown with every AI response
- [ ] Unit tests for edge cases (empty data, single cell, large range)

### 2.3 Source Linking

- [x] Create `app/services/source_linker.py`
- [x] Parse AI response text for row/cell references
  - [x] Detect patterns: "Row 5", "Rows 45-67", "Cell A1", "Range B2:D10"
  - [x] Detect sheet references: "Sheet1!A1:B10"
  - [x] Detect bare ranges: "A1:D10"
- [x] Convert detected references into structured source objects
  - [x] Format: `{"label": "Rows 45-67", "sheet": "Sheet1", "range": "A45:A67"}`
- [ ] Replace plain-text references with clickable link markers in response
- [x] Store sources in `messages.sources` JSONB column
- [ ] Validate references against actual sheet dimensions (when data provided)

### 2.4 Chat Query Endpoint

- [x] Implement `POST /api/chat/query`
  - [x] Request body: `{ conversation_id?, message, sheet_data?, sheet_name? }`
  - [ ] Auth required (JWT) — done (Supabase Auth)
  - [x] Check usage limits for user tier before processing
  - [x] If no `conversation_id`, create new conversation
  - [x] Save user message to `messages` table
  - [x] Build AI prompt with sheet context
  - [x] Call AI provider
  - [x] Calculate confidence score
  - [x] Extract source links
  - [x] Save assistant message (with confidence + sources) to `messages` table
  - [x] Increment usage counter (`chat_count`)
  - [x] Return response: `{ message, confidence_score, confidence_tier, sources, conversation_id }`
- [ ] Response latency target: < 3 seconds (p95)

### 2.5 Conversation History Endpoint

- [x] Implement `GET /api/chat/history`
  - [ ] Auth required — done (Supabase Auth)
  - [x] Query param: `conversation_id` (optional — list all if omitted)
  - [x] If `conversation_id`: return all messages in order
  - [x] If omitted: return list of conversations with last message preview
  - [x] Paginate results (default 20, max 100)
- [x] Implement `DELETE /api/chat/history/{conversation_id}`
  - [ ] Auth required, user must own conversation — done (Supabase Auth)
  - [x] Cascade delete all messages

### 2.6 Response Caching (Redis)

- [x] Create `app/services/cache.py`
- [x] Initialize Redis client from `REDIS_URL`
- [x] Cache key: SHA-256 hash of `(user_id, endpoint, prompt, data)`
- [x] Cache TTL: 1 hour (configurable)
- [x] Check cache before calling AI provider
- [x] Store response in cache after AI call
- [x] Cache hit returns instantly with same confidence + sources
- [x] Add cache bypass option for users (`force_refresh` param)
- [x] Wired into: `/chat/query`, `/formula/execute`, `/formula/explain`, `/formula/fix`
- [x] Falls open: if Redis unavailable, requests go straight to AI

---

## Stage 3: Cell Formula Engine (P0)

### 3.1 Formula Execution

- [x] Implement `POST /api/formula/execute`
  - [x] Request body: `{ prompt, range_data, options? }`
  - [x] `range_data`: 2D array of cell values from the referenced range
  - [x] `options`: `{ temperature?, format? }` (JSON)
  - [ ] Auth required — done (Supabase Auth)
  - [x] Check usage limits
  - [x] Build focused AI prompt (single-output, no conversational context)
  - [x] Call AI provider
  - [x] Calculate confidence score
  - [x] Extract source links
  - [x] Increment `formula_count` in usage
  - [x] Return: `{ result, confidence_score, confidence_tier, sources }`
- [ ] Support batch execution
  - [ ] Accept array of prompts for parallel processing
  - [ ] Return array of results
  - [ ] Single usage increment per batch

### 3.2 Formula Explainer

- [x] Implement `POST /api/formula/explain`
  - [x] Request body: `{ formula }` (e.g., `=VLOOKUP(A2,Sheet2!A:D,4,FALSE)`)
  - [ ] Auth required — done (Supabase Auth)
  - [x] Send formula to AI with "explain in plain English" system prompt
  - [x] Return: `{ explanation, confidence_score, confidence_tier }`
  - [x] Increment `query_count`

### 3.3 Formula Fixer (P2)

- [x] Implement `POST /api/formula/fix`
  - [x] Request body: `{ formula, error_message, sheet_context? }`
  - [ ] Auth required — done (Supabase Auth)
  - [x] AI analyzes broken formula + error
  - [x] Return: `{ fixed_formula, explanation, what_was_wrong }`

### 3.4 Rate Limiting

- [x] Create `app/services/rate_limiter.py`
- [x] Implement per-user rate limiting using Redis
  - [x] Free: 5 requests/minute
  - [x] Pro: 20 requests/minute
  - [x] Team: 50 requests/minute
- [x] Return `429 Too Many Requests` with `Retry-After` header
- [x] Rate limit applied to `/chat/query`, `/formula/execute`, `/formula/explain`, `/formula/fix`

---

## Stage 4: Usage Tracking & Billing

### 4.1 Usage Tracking Service

- [x] Create `app/services/usage.py`
- [x] Track per-user, per-period usage
  - [x] Upsert `usage_records` row for current month
  - [x] Increment `query_count`, `formula_count`, or `chat_count`
- [x] Check limits before processing requests
  - [x] Free: 50 total messages/month
  - [x] Pro: 1,000 total messages/month
  - [x] Team: Unlimited
- [x] Return `{ used, limit, remaining }` on limit check
- [x] Return `402 Payment Required` when limit exceeded (with upgrade prompt)

### 4.2 Usage Stats Endpoint

- [x] Implement `GET /api/usage/stats`
  - [ ] Auth required — done (Supabase Auth)
  - [x] Return current period usage breakdown
  - [ ] Return historical usage (last 30 days)
  - [x] Include tier info and limits

### 4.3 Stripe Integration

- [ ] Create `app/services/billing.py`
- [ ] Implement `POST /api/billing/create-checkout`
  - [ ] Create Stripe Checkout Session for Pro or Team tier
  - [ ] Return checkout URL
- [ ] Implement `POST /api/billing/webhook`
  - [ ] Verify Stripe webhook signature
  - [ ] Handle events:
    - [ ] `checkout.session.completed` → update user tier + Stripe IDs
    - [ ] `customer.subscription.updated` → update tier on plan change
    - [ ] `customer.subscription.deleted` → downgrade to free
    - [ ] `invoice.payment_failed` → flag account, send warning
- [ ] Implement `POST /api/billing/portal`
  - [ ] Create Stripe Customer Portal session
  - [ ] Return portal URL (manage subscription, invoices)
- [ ] Implement `GET /api/billing/status`
  - [ ] Return current subscription details

### 4.4 Stripe Products Setup

- [ ] Create Stripe Products:
  - [ ] SheetMind Pro — Monthly ($12/mo)
  - [ ] SheetMind Pro — Annual ($9/mo, billed $108/yr)
  - [ ] SheetMind Team — Monthly ($39/mo)
  - [ ] SheetMind Team — Annual ($29/mo, billed $348/yr)
- [ ] Store Price IDs in environment config

---

## Stage 5: Polish & P1 Features

### 5.1 Smart Templates

- [x] Create `templates` table in Supabase
  - [x] `id` UUID
  - [x] `category` VARCHAR (sales, marketing, finance, ops, general)
  - [x] `title` VARCHAR
  - [x] `prompt` TEXT
  - [x] `description` TEXT
  - [x] `is_default` BOOLEAN (system-provided vs user-created)
  - [x] `created_by` UUID FK → users, nullable
  - [x] `created_at`, `updated_at`
  - [x] RLS policies (read defaults, CRUD own custom templates)
- [x] Seed 52 default templates covering:
  - [x] Sales (10): pipeline analysis, forecast, win/loss, territory, quota
  - [x] Marketing (10): campaign ROI, SEO audit, content calendar, A/B results, audience
  - [x] Finance (10): budget variance, P&L summary, cash flow, expense categorization, YoY
  - [x] Operations (10): inventory, scheduling, SLA tracking, vendor comparison, capacity
  - [x] General (12): summarize, categorize, compare, rank, deduplicate, clean data, sentiment
- [x] Implement `GET /api/templates`
  - [x] Return default templates + user's custom templates
  - [x] Filter by category
  - [x] `GET /api/templates/categories` — list all categories
- [x] Implement `POST /api/templates` (Pro/Team only via `require_tier`)
  - [x] Create custom template
- [x] Implement `DELETE /api/templates/{id}`
  - [x] User can only delete own custom templates
  - [x] Cannot delete default templates

### 5.2 Instant Charts

- [x] Create `app/services/chart_generator.py`
- [x] Implement `POST /api/chat/chart`
  - [x] Request body: `{ data, chart_type?, title? }`
  - [x] Auto-detect best chart type if not specified (bar, line, pie, scatter)
  - [x] Generate chart config (Chart.js or similar JSON spec)
  - [x] Return chart config for frontend rendering
- [x] Detect "show chart" / "visualize" intent in chat queries
  - [x] Auto-generate chart alongside text response
- [x] Confidence score: chart appropriateness indicator

### 5.3 Formula Explainer Enhancements

- [x] Support all common Google Sheets / Excel functions
- [x] Step-by-step breakdown mode (explain each nested function)
- [x] Suggest simpler alternatives when possible

---

## Stage 6: Team & Enterprise (P2/P3)

### 6.1 Export History

- [ ] Implement `GET /api/chat/export/{conversation_id}`
  - [ ] Auth required, Team tier only
  - [ ] Query param: `format=pdf|csv`
  - [ ] PDF export: formatted conversation with confidence badges
  - [ ] CSV export: `timestamp, role, message, confidence_score, sources`
  - [ ] Complete in < 10 seconds
- [ ] Add `GET /api/chat/export-all`
  - [ ] Export all conversations for the user

### 6.2 Team Management

- [ ] Create `teams` table
  - [ ] `id` UUID
  - [ ] `name` VARCHAR
  - [ ] `owner_id` UUID FK → users
  - [ ] `created_at`, `updated_at`
- [ ] Create `team_members` table
  - [ ] `id` UUID
  - [ ] `team_id` UUID FK → teams
  - [ ] `user_id` UUID FK → users
  - [ ] `role` ENUM (owner, admin, member)
  - [ ] `joined_at` TIMESTAMPTZ
- [ ] Implement team CRUD endpoints:
  - [ ] `POST /api/teams` — create team
  - [ ] `GET /api/teams/{id}` — get team details
  - [ ] `POST /api/teams/{id}/invite` — invite member by email
  - [ ] `DELETE /api/teams/{id}/members/{user_id}` — remove member
  - [ ] `PATCH /api/teams/{id}/members/{user_id}` — update role

### 6.3 Team Template Sharing

- [ ] Add `team_id` nullable FK to `templates` table
- [ ] Shared templates visible to all team members
- [ ] Only admins/owners can create shared templates

### 6.4 Admin Dashboard Data

- [ ] Implement `GET /api/teams/{id}/usage`
  - [ ] Aggregate usage across all team members
  - [ ] Per-member breakdown
  - [ ] Trends over time

### 6.5 Enterprise Security

- [ ] SOC 2 Type II compliance audit prep
- [ ] Data encryption at rest (AES-256) — verify Supabase config
- [ ] GDPR endpoints:
  - [ ] `GET /api/account/export` — full data export
  - [ ] `DELETE /api/account` — account + data deletion
- [ ] Audit logging for all data access

---

## Stage 7: Frontend — Google Sheets Add-on

### 7.1 Project Setup

- [ ] Initialize Google Apps Script project
- [ ] Set up React build pipeline (bundled into Apps Script HTML)
- [ ] Configure `appsscript.json` manifest
  - [ ] OAuth scopes: `spreadsheets.currentonly`, `script.external_request`
- [ ] Set up development/staging/production environments

### 7.2 Authentication Flow

- [ ] "Sign in with Google" button in sidebar
- [ ] OAuth flow using Apps Script's built-in `ScriptApp.getOAuthToken()`
- [ ] Exchange Google token for SheetMind JWT via `/api/auth/login`
- [ ] Store JWT in `PropertiesService.getUserProperties()`
- [ ] Auto-refresh token on expiry
- [ ] Show user avatar + name in sidebar header

### 7.3 Chat Sidebar UI

- [ ] Sidebar opens via menu item / toolbar icon
- [ ] Load time target: < 2 seconds
- [ ] Components:
  - [ ] Header: logo, settings gear, close button
  - [ ] Message list: scrollable, auto-scroll to latest
  - [ ] User message bubble (right-aligned)
  - [ ] Assistant message bubble (left-aligned)
    - [ ] Confidence badge (top-right): color-coded, shows percentage
    - [ ] Source links: underlined, clickable row references
    - [ ] Action buttons: "View Chart", "Copy"
  - [ ] Template picker: dropdown with category filter
  - [ ] Input area: textarea + send button
- [ ] Markdown rendering in AI responses
- [ ] Loading spinner / typing indicator during AI processing
- [ ] Error states: network error, rate limit, auth expired
- [ ] Responsive: works in sidebar width (~300-400px)

### 7.4 Confidence Score Display

- [ ] Badge component with color: Green `#10b981`, Yellow `#f59e0b`, Red `#ef4444`
- [ ] Tooltip on hover: shows score breakdown
- [ ] Free tier: badge hidden (upgrade prompt on click)

### 7.5 Source Linking (Click-to-Verify)

- [ ] Parse source objects from API response
- [ ] Render as underlined clickable text in message
- [ ] On click:
  - [ ] Call `SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet)`
  - [ ] Navigate to referenced range
  - [ ] Highlight referenced cells (background color) for 3 seconds
  - [ ] Restore original formatting after highlight
- [ ] Free tier: source links disabled (upgrade prompt)

### 7.6 Cell Formula — `=SHEETMIND()`

- [ ] Register custom function via Apps Script
  - [ ] Function signature: `SHEETMIND(prompt, range, options)`
  - [ ] JSDoc annotations for autocomplete help
- [ ] On execution:
  - [ ] Read cell values from referenced range
  - [ ] Call `POST /api/formula/execute` with prompt + data
  - [ ] Return result value to cell
- [ ] Add cell comment with confidence score on completion
- [ ] Right-click context menu: "Explain this AI result"
- [ ] Handle errors gracefully (return `#ERROR!` with message)
- [ ] Batch support: formula dragged across multiple rows

### 7.7 Onboarding Flow

- [ ] First-launch detection (`PropertiesService` flag)
- [ ] Step 1: Welcome modal with product overview
- [ ] Step 2: Tutorial overlay highlighting:
  - [ ] Chat input area
  - [ ] Template picker
  - [ ] Confidence score badge
  - [ ] Source link example
- [ ] Step 3: First prompt suggestion: "What can you tell me about this data?"
- [ ] Step 4: Show `=SHEETMIND()` formula tip
- [ ] "Skip tutorial" option
- [ ] Mark onboarding complete in user properties

### 7.8 Settings Panel

- [ ] Account info (email, tier, avatar)
- [ ] Usage meter (used / limit for current period)
- [ ] Upgrade button (links to Stripe checkout)
- [ ] Theme toggle (light/dark) — optional
- [ ] Clear conversation history
- [ ] Sign out

### 7.9 Styling & Brand

- [ ] Primary color: Emerald `#059669`
- [ ] Font: Inter (headings/body), JetBrains Mono (code)
- [ ] Logo: sparkle icon + "SheetMind" wordmark
- [ ] WCAG 2.1 AA compliance (contrast, focus states, screen reader labels)

---

## Stage 8: Testing & Quality

### 8.1 Backend Tests

- [ ] Unit tests for confidence score algorithm
- [ ] Unit tests for source link parser
- [ ] Unit tests for rate limiter
- [ ] Integration tests for auth flow (mock Google OAuth)
- [ ] Integration tests for chat endpoint (mock AI provider)
- [ ] Integration tests for formula endpoint
- [ ] Integration tests for usage tracking + limit enforcement
- [ ] Integration tests for billing webhooks
- [ ] Load test: 100 concurrent requests

### 8.2 Frontend Tests

- [ ] Component tests for chat sidebar
- [ ] Component tests for confidence badge
- [ ] Component tests for source linking
- [ ] E2E test: full chat flow in Google Sheets
- [ ] E2E test: formula execution in cell

### 8.3 Security Testing

- [ ] OWASP Top 10 review
- [ ] SQL injection testing (parameterized queries verified)
- [ ] XSS testing (response sanitization)
- [ ] JWT validation edge cases (expired, tampered, missing)
- [ ] Rate limit bypass attempts
- [ ] RLS policy verification (cross-user data access)

---

## Stage 9: Deployment & DevOps

### 9.1 Backend Deployment

- [ ] Choose hosting: AWS Lambda + API Gateway OR container (ECS/Fly.io)
- [ ] Set up CI/CD pipeline (GitHub Actions)
  - [ ] Lint + type check on PR
  - [ ] Run tests on PR
  - [ ] Auto-deploy to staging on merge to `develop`
  - [ ] Manual promote to production on `main`
- [ ] Configure environment variables in deployment platform
- [ ] Set up domain + SSL (`api.sheetmind.xyz`)
- [ ] Configure CORS for production domains

### 9.2 Monitoring & Observability

- [ ] Error tracking: Sentry integration
- [ ] APM: Datadog or equivalent
- [ ] Uptime monitoring (target > 99.5%)
- [ ] API latency dashboards (p50, p95, p99)
- [ ] AI provider cost monitoring with 80% budget alerts
- [ ] Redis cache hit rate dashboard
- [ ] Alerts: error rate spike, latency spike, provider failure

### 9.3 Google Workspace Marketplace

- [ ] Create developer account
- [ ] Prepare listing assets:
  - [ ] App icon (96x96, 128x128)
  - [ ] Screenshots (1280x800) — sidebar, formula, confidence scores
  - [ ] Demo video (< 2 min)
  - [ ] Description with target keywords
- [ ] Submit for review
- [ ] Publish to marketplace

---

## Stage 10: Post-Launch & Growth

### 10.1 Analytics

- [ ] Integrate PostHog (or similar)
- [ ] Track events:
  - [ ] `signup`, `login`, `chat_query`, `formula_execute`
  - [ ] `template_used`, `chart_generated`, `source_link_clicked`
  - [ ] `upgrade_started`, `upgrade_completed`, `churn`
- [ ] Set up funnels: install → signup → first query → repeat use → upgrade
- [ ] Weekly active users dashboard
- [ ] North star metric: "Weekly active users with 5+ verified insights"

### 10.2 Feedback Loop

- [ ] In-app feedback button (thumbs up/down on AI responses)
- [ ] Store feedback → improve confidence score accuracy over time
- [ ] NPS survey (quarterly, in-app)
- [ ] Feature request collection

### 10.3 Phase 2 Features (Future)

- [ ] Data connectors: BigQuery, PostgreSQL, MySQL (Month 4)
- [ ] Scheduled reports: daily/weekly email summaries (Month 5)
- [ ] Custom personas: Analyst, Marketer, Finance modes (Month 5)
- [ ] Offline mode: process sensitive data locally (Month 6)
- [ ] Excel Desktop native add-in (Month 6)
- [ ] Microsoft Excel Online add-on (Phase 1 stretch)
- [ ] International expansion / localization

---

## Quick Reference: Priority Map

| Priority | Items | Stage |
|----------|-------|-------|
| **P0** | Database, Auth, Chat, Formulas, Confidence Scores, Source Linking | 1-3 |
| **P1** | Smart Templates, Instant Charts, Formula Explainer | 5 |
| **P2** | Export History, Team Sharing, Formula Fixer | 6 |
| **P3** | Admin Dashboard, Scheduled Reports, Data Connectors | 10 |

---

*Last updated: 2026-01-30*
