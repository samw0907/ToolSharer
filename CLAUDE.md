# ToolSharer - Project Context

## Project Overview

**ToolSharer** is a cloud-native tool-sharing application designed to showcase AWS architecture, OAuth2 authentication, AI integration, and geospatial features. This is a portfolio project demonstrating modern full-stack development skills with emphasis on cloud infrastructure and real-world patterns.

**Primary Goal**: Create a polished, presentable portfolio piece (not a commercial product) that demonstrates:
- AWS cloud-native architecture
- OAuth2 authentication
- AI-powered features (Vercel AI SDK)
- Geospatial functionality (geocoding + radius search)
- Serverless background jobs (Lambda)

**Timeline**: 4 weeks (24 working days × 6 hours/day = 144 hours)

---

## Tech Stack

### Frontend
- **Framework**: React + Vite
- **Language**: TypeScript
- **State Management**: useState/useReducer (simple)
- **AI Integration**: Vercel AI SDK (streaming chat)
- **Maps**: Leaflet with OpenStreetMap tiles (or AWS Location Service)
- **Deployment**: S3 + CloudFront CDN

### Backend
- **Framework**: FastAPI (Python)
- **API Style**: REST (not GraphQL)
- **Authentication**: OAuth2 with Google
- **Session Management**: JWT or secure cookies
- **Containerization**: Docker
- **Hosting**: ECS on Fargate (containerized, managed)

### Data Layer
- **Database**: Amazon RDS PostgreSQL
- **Geocoding**: Mapbox/Google/OSM Nominatim API (real lat/lng, no PostGIS for v1)
- **Storage**: S3 for images (original + thumbnails)
- **Email**: Amazon SES

### Infrastructure
- **IaC**: AWS CDK (Python or TypeScript)
- **Compute**: ECS Fargate
- **Serverless**: 3 Lambda functions (image processing, reminders, stats)
- **Events**: EventBridge for scheduled jobs
- **Networking**: Application Load Balancer → Fargate

---

## Architecture Pattern

**One core backend service + focused Lambda functions**

Not full microservices (too complex for scope), but service-oriented with serverless components where they shine:
- Main FastAPI service handles API, auth, CRUD operations
- Lambda 1: S3-triggered image processing
- Lambda 2: Scheduled overdue reminders
- Lambda 3: Scheduled stats aggregation

---

## Core Features (MVP)

### 1. Authentication & User Accounts
- Sign in with Google OAuth2
- User profile with name, email
- Set home location (free-text address → geocoded to lat/lng)
- JWT/session-based auth for protected routes

### 2. Tool Management
**Create Tools**:
- Name, description, category, condition notes
- Location: free-text address → geocoded to lat/lng
- Upload tool image via pre-signed S3 URL
- Map preview showing tool location pin

**Browse Tools**:
- List all tools with thumbnails, category, distance
- Filter by category
- Tool detail page with full info, large image, owner, map pin

**Manage Own Tools**:
- View "My Tools"
- Edit tool information (including location)
- Delete tool (optional)

### 3. Borrowing & Returning (IMPLEMENTED - ENHANCED)
**Request-Approval Workflow** (More realistic than originally planned):
- Borrower selects start date + due date and requests to borrow
- Owner reviews incoming requests and approves/declines
- **Two-Step Return Process**:
  1. Borrower clicks "I Returned This" → Status: RETURN_PENDING
  2. Owner clicks "Confirm Return" → Status: RETURNED, tool available again
- Overdue tracking with visual indicators
- Full request history

**Status Flow:**
- PENDING → APPROVED → RETURN_PENDING → RETURNED
- Alternative paths: DECLINED, CANCELLED

### 4. Location & Mapping (3-lite Geo Approach)
**Geocoding**:
- Backend `/geocode` endpoint calls geocoding API
- Converts free-text addresses to lat/lng
- Stores in both user and tool records (no PostGIS needed)

**Radius Search**:
- `/tools/near?lat=&lng=&radius_km=10` endpoint
- Haversine distance calculation in Python
- Returns nearby tools with `distance_km` field

**Map UI**:
- Interactive map with tool pins
- "Tools near me" toggle
- Radius filter (within X km)
- Optional browser geolocation support
- Displays distance on each tool card

### 5. Smart Tool Helper (AI Feature)
- Chat UI using Vercel AI SDK (streaming responses)
- Backend `/api/ai/chat` endpoint
- Prompts LLM (OpenAI/Anthropic) with tool context
- Provides:
  - Tool suggestions for tasks
  - Safety notes
  - Usage instructions/checklists

### 6. Background Automation (Lambda Functions)
**Lambda 1 - Image Processing**:
- Trigger: S3 ObjectCreated event on `tool-images-original/`
- Validates image is appropriate format
- Generates thumbnail(s)
- Saves to `tool-images-thumbnails/`
- Updates DB with thumbnail URL
- **Future Enhancement**: Add AWS Rekognition for automated content moderation

**Lambda 2 - Overdue Reminders**:
- Trigger: EventBridge schedule (hourly/daily)
- Queries for overdue loans (due_date < now, not returned)
- Sends reminder email via SES
- Marks `reminder_sent = true`
- **Note**: SES in sandbox mode for demo (sends to verified addresses only)

**Lambda 3 - Stats Aggregation** (Nice-to-Have):
- Trigger: EventBridge nightly schedule
- Computes aggregate stats (total tools, loans this month, popular categories)
- Stores in `stats_summary` table
- Powers dashboard widgets

### 7. Dashboard & Stats
- User dashboard showing:
  - Tools you own
  - Active loans
  - Basic statistics
- Optional global stats if Lambda 3 implemented

---

## Database Schema

### `users`
- `id` (uuid, PK)
- `google_sub` (text, unique) - Stable Google user ID
- `email` (text)
- `name` (text)
- `home_address_text` (text, nullable) - What user typed
- `home_lat` (float, nullable) - Geocoded latitude
- `home_lng` (float, nullable) - Geocoded longitude
- `created_at`, `updated_at` (timestamptz)

### `tools`
- `id` (uuid, PK)
- `owner_id` (uuid, FK → users.id)
- `name` (text)
- `description` (text)
- `category` (text) - e.g., "drill", "saw", "garden"
- `condition` (text, nullable) - Optional notes
- `address_text` (text) - What owner typed
- `lat` (float) - Geocoded latitude
- `lng` (float) - Geocoded longitude
- `created_at`, `updated_at` (timestamptz)

### `tool_images`
- `id` (uuid, PK)
- `tool_id` (uuid, FK → tools.id)
- `original_key` (text) - S3 key for original
- `thumbnail_key` (text) - S3 key for thumbnail
- `created_at` (timestamptz)

### `borrow_requests` (IMPLEMENTED - replaces tool_loans)
**Note:** Changed from simple `tool_loans` to `borrow_requests` for more realistic approval workflow.

- `id` (integer, PK)
- `tool_id` (integer, FK → tools.id)
- `borrower_id` (integer, FK → users.id)
- `message` (text, nullable) - Optional message to owner
- `start_date` (date, nullable)
- `due_date` (date, nullable)
- `status` (enum) - PENDING, APPROVED, DECLINED, CANCELLED, RETURN_PENDING, RETURNED
- `created_at`, `updated_at` (timestamptz)

**Current Implementation Uses:**
- Integer IDs (not UUIDs) for simplicity in v1
- SQLite for local development (will migrate to PostgreSQL)

### `stats_summary` (for Lambda 3)
- `id` (uuid, PK)
- `snapshot_date` (date)
- `total_tools` (integer)
- `total_active_loans` (integer)
- `loans_last_7_days` (integer)
- `loans_last_30_days` (integer)

---

## API Endpoints

### Health (IMPLEMENTED)
- `GET /health` - Healthcheck
- `GET /ping` - Ping endpoint

### Auth & User (IMPLEMENTED)
- `GET /auth/google/login` - Redirect to Google OAuth2 (no auth) ✨ NEW
- `GET /auth/google/callback` - Handle OAuth callback, create/find user, issue JWT (no auth) ✨ NEW
- `POST /auth/dev/login` - Dev bypass login (no auth, only when DEV_AUTH_ENABLED=True) ✨ NEW
- `GET /auth/me` - Get current user profile (auth required) ✨ NEW
- `POST /auth/logout` - Logout (stateless JWT, client discards token) ✨ NEW
- `PUT /me` - Update user profile (auth required) - TODO
- `PUT /me/location` - Save home location (auth required) - TODO

### Users (IMPLEMENTED - basic)
- `GET /users` - List all users (for demo user selector)
- `POST /users` - Create user

### Geocoding (TODO)
- `POST /geocode` - Convert address to lat/lng (auth required)
  - Body: `{ address: string }`
  - Returns: `{ lat, lng, formatted_address }`

### Tools (IMPLEMENTED)
- `GET /tools` - List all tools with optional current_user_id filter
- `GET /tools/{tool_id}` - Get tool details (TODO)
- `GET /tools/owner/{owner_id}` - List user's tools with borrow status
- `POST /tools` - Create a tool (auth required, owner set from JWT)
- `PUT /tools/{tool_id}` - Update tool (name, description, location) ✨ NEW
- `PATCH /tools/{tool_id}/availability` - Toggle availability
- `DELETE /tools/{tool_id}` - Delete tool (if no borrow requests exist)

### Tools - Location-based (TODO)
- `GET /tools/near?lat=&lng=&radius_km=` - Get nearby tools with distances

### Tool Images (TODO)
- `POST /tools/{tool_id}/image-upload-url` - Get pre-signed S3 URL for upload

### Borrow Requests (IMPLEMENTED)
- `GET /borrow_requests` - List all requests
- `GET /borrow_requests/owner/{owner_id}` - Owner's incoming requests
- `GET /borrow_requests/borrower/{borrower_id}` - User's borrow requests
- `POST /borrow_requests` - Create borrow request
- `PATCH /borrow_requests/{request_id}/approve` - Approve request
- `PATCH /borrow_requests/{request_id}/decline` - Decline request
- `PATCH /borrow_requests/{request_id}/cancel` - Cancel request (borrower)
- `PATCH /borrow_requests/{request_id}/initiate-return` - Borrower marks as returned ✨ NEW
- `PATCH /borrow_requests/{request_id}/confirm-return` - Owner confirms return ✨ NEW

### AI (TODO)
- `POST /ai/chat` - Smart Tool Helper chat endpoint
  - Streams LLM response back to frontend

### Stats (TODO)
- `GET /me/summary` - User's summary stats
- `GET /stats/summary` - Global stats

---

## Development Phases (4-Week Plan)

### Week 1 - Backend Foundations & Auth (Days 1-6)
- Day 1: Project setup, FastAPI skeleton, Dockerfile, local dev
- Day 2: Database schema, models, Alembic migrations, connection pooling config
- Day 3: Google OAuth2 backend implementation + email verification check
- Day 4: Frontend OAuth2 integration, login/protected routes
- Day 5: User profile endpoints, home location field
- Day 6: `/geocode` endpoint implementation, rate limiting, response caching

### Week 2 - Tools, Loans, Location, Map (Days 7-12)
- Day 7: CRUD endpoints for tools with geocoding
- Day 8: Tool list + detail pages, image upload workflow with validation (file type, size, rate limiting)
- Day 9: Borrow + return endpoints, My Loans page, database constraint for loan conflicts
- Day 10: Haversine calculation, `/tools/near` endpoint
- Day 11: Frontend map integration (Leaflet)
- Day 12: "Tools near me" UI with distance display

### Week 3 - AI, Lambda, Polish (Days 13-18)
- Day 13: Vercel AI SDK chat UI, Smart Tool Helper panel
- Day 14: Backend `/ai/chat` endpoint, prompt engineering
- Day 15: Lambda 1 (image processing) + S3 triggers
- Day 16: Lambda 2 (overdue reminders) + SES integration
- Day 17: Lambda 3 (stats aggregator) - optional
- Day 18: Dashboard stats integration

### Week 4 - Deployment, Testing, Documentation (Days 19-24)
- Day 19: CDK stack (VPC, RDS, S3, ECS)
- Day 20: Deploy frontend to S3 + CloudFront
- Day 21: Domain + HTTPS, SES production config
- Day 22: End-to-end QA, bug fixes
- Day 23: README, architecture diagram, endpoint docs
- Day 24: Final polish, screenshots, demo video/GIFs

---

## Key Constraints & Design Decisions

### Why These Choices Were Made

**Fargate over EC2**: Easier to explain in interviews, less admin overhead, "modern" architecture. Cost difference minimal for low-traffic demo app.

**PostgreSQL over DynamoDB**: Leveraging existing experience, avoiding additional learning curve. Relational model suits the domain well.

**No PostGIS for v1**: Keep geo implementation simple with Haversine distance calculation. Real geocoding + lat/lng storage demonstrates geospatial skills without infrastructure complexity. Can add PostGIS as "v2" enhancement later.

**3 Lambda Functions**: Surgical placement where serverless shines (event-driven, scheduled jobs) without full microservices complexity.

**REST over GraphQL**: Simpler for this scope, easier to document and demo.

**Vercel AI SDK**: Modern, showcases streaming AI capabilities, good for portfolio.

### What We're NOT Doing (Out of Scope)
- ❌ Full microservices architecture (too complex)
- ❌ PostGIS / advanced spatial indexing (v1)
- ❌ Real-time notifications / WebSockets
- ❌ Payment processing
- ❌ Advanced admin panels
- ❌ Multi-language support
- ❌ Complex permission systems beyond owner-checks
- ❌ Salesforce integration (separate Project 2)

---

## Coding Conventions & Preferences

### Python/FastAPI
- Use type hints throughout
- Pydantic models for request/response validation
- Alembic for database migrations
- async/await where appropriate
- Environment variables via `.env` and pydantic-settings
- Clear separation: routers, models, schemas, services

### React/TypeScript
- Functional components with hooks
- TypeScript strict mode
- Component co-location (component + styles in same folder)
- Clear naming: `UserProfile.tsx`, `ToolCard.tsx`
- Avoid prop drilling - context where needed

### General
- Clear, descriptive variable names
- Comments for complex logic only (code should be self-documenting)
- Error handling at API boundaries
- Consistent formatting (Prettier for frontend, Black for Python)

---

## Current Project Status

**Progress: ~55% Complete** (Updated: Jan 30, 2025)

### ✅ Completed (Session 1 - UX Overhaul)

**Backend:**
- FastAPI app structure with routers, models, schemas, services
- SQLAlchemy ORM + Alembic migrations (7 migrations total)
- 27 API endpoints for users, tools, and borrow requests
- BorrowRequest model with approval workflow (PENDING → APPROVED → RETURN_PENDING → RETURNED)
- Two-step return endpoints (initiate-return, confirm-return)
- Edit tool endpoint (PUT /tools/{id})
- Overdue calculation for active loans

**Frontend:**
- React + TypeScript + Vite
- **3-page structure** (consolidated from original 4-page plan):
  1. **Browse Tools** - Discover and request tools (hides own tools by default)
  2. **My Lending** - Consolidated tools inventory + incoming requests + active loans
  3. **My Borrowing** - Outgoing requests + tools being borrowed
- Two-step return UI (borrower initiates, owner confirms)
- Edit tool form component
- API integration layer with error handling
- User selector for testing (will be replaced with OAuth2)

**Database:**
- PostgreSQL 15 via Docker Compose (production-ready)
- SQLite still available for local-only development
- Users, Tools, BorrowRequests tables
- Status enum includes RETURN_PENDING and RETURNED

### 🚧 In Progress / Next Up

**Quick Win Polish Features (TIER 0):**

These small features add professional polish with minimal effort:

1. ✅ **Show owner name/email instead of "Owner ID"** - DONE (Session 2)
   - Added `owner_email` and `owner_name` to ToolRead schema
   - Display owner name/email on tool cards in Browse Tools

2. ✅ **Notification counts on nav buttons** - DONE (Session 2)
   - Red badge on "My Lending" for pending requests + returns to confirm
   - Orange badge on "My Borrowing" for overdue items + pending returns

3. ✅ **Basic search/filter on Browse Tools** - DONE (Session 2)
   - Text input to filter by tool name or description
   - "Hide unavailable tools" checkbox
   - Client-side filtering

4. ✅ **Pending request count badge on tools** - DONE (Session 2)
   - Shows "X pending request(s)" in orange on tool cards
   - Added `pending_request_count` to backend

5. ✅ **Request message preview on Browse Tools** - DONE (Session 2)
   - Shows "Your message: ..." when user has pending request
   - Added `my_pending_request_message` to backend

6. ✅ **Due date quick presets** - DONE (Session 2)
   - Preset buttons: "1 day", "3 days", "1 week", "2 weeks"
   - Custom date picker still available

7. ✅ **Empty states with helpful messages** - DONE (Session 2)
   - BrowseToolsPage: "No tools available yet" vs "No tools match your filters"
   - MyLendingPage: "You haven't added any tools yet" with guidance
   - MyBorrowingPage: "You haven't borrowed any tools yet" with guidance
   - Styled consistently with dashed borders and helpful text

---

**Immediate Priority (TIER 1):**
1. ✅ OAuth2 with Google (remove user selector) - DONE (Session 2)
2. ✅ Database schema updates (add missing fields for geocoding) - DONE (Session 3)
3. ✅ Docker + PostgreSQL setup - DONE (Session 5: fully working, all migrations pass on PostgreSQL)
4. Lambda functions (image processing, overdue reminders)

**Secondary Priority (TIER 2):**
5. ✅ Geospatial features (geocoding, maps, radius search) - DONE (Sessions 3+4+5: backend + frontend + bugfixes)
6. AI integration (Smart Tool Helper)

**Deployment (TIER 3):**
7. AWS CDK infrastructure
8. Deploy to production

### 📝 Design Decisions Made

- **BorrowRequest model** instead of simple ToolLoans (more realistic approval workflow)
- **Two-step return process** for better accountability (borrower initiates, owner confirms)
- **3-page frontend** for clearer mental model
- **Integer IDs** instead of UUIDs for v1 simplicity
- **PostgreSQL** via Docker Compose for development (SQLite still works for quick local testing)

---

## Frontend Page Structure (IMPLEMENTED)

The application uses a **3-page layout** for clearer user experience:

### 1. Browse Tools (BrowseToolsPage.tsx)
- Discover tools available to borrow
- **Hides user's own tools by default** (toggle to show)
- Request to borrow with dates and message
- Shows tool availability and borrow status

### 2. My Lending (MyLendingPage.tsx)
**Consolidated view for tool owners** with 5 sections:
1. **My Tools Inventory** - Create, edit, delete tools
2. **Pending Requests** - Incoming requests needing approval
3. **Returns Pending Confirmation** - Borrowers marked as returned, awaiting owner confirmation
4. **Active Loans** - Currently borrowed tools
5. **History** - Completed requests

### 3. My Borrowing (MyBorrowingPage.tsx)
**View for borrowers** with 4 sections:
1. **Currently Borrowing** - Active loans with "I Returned This" button
2. **Return Pending Owner Confirmation** - Waiting for owner to confirm
3. **Pending Approval** - Requests waiting for owner approval
4. **History** - Completed requests

**Rationale:** Consolidated from 4 pages (Tools, Owner Requests, My Requests, My Tools) to 3 pages for simpler mental model and reduced cognitive load.

---

## Interview Talking Points

When discussing this project, emphasize:

1. **AWS Architecture**: "I built a cloud-native application using ECS Fargate for the main service, with Lambda functions for event-driven workflows like image processing and scheduled reminders."

2. **OAuth2**: "Implemented Google OAuth2 authentication flow with proper token handling and session management."

3. **Geospatial Features**: "Added location-aware functionality with geocoding and radius-based search using Haversine distance calculations. Users can find tools near them with real map visualization."

4. **AI Integration**: "Built an AI-powered Smart Tool Helper using Vercel AI SDK for streaming responses, helping users choose the right tools and understand safety requirements."

5. **Serverless Patterns**: "Designed Lambda functions for specific jobs: S3-triggered image processing, EventBridge-scheduled reminder emails, and nightly stats aggregation."

6. **Infrastructure as Code**: "Defined the entire AWS stack using CDK, making the infrastructure reproducible and maintainable."

---

## Notes for Claude

- This is a portfolio project - prioritize clean architecture and clear demonstration of skills over feature completeness
- When suggesting implementations, keep them production-quality but appropriately scoped
- Reference this document's timeline and constraints when planning work
- If a feature risks scope creep, flag it and suggest deferring to "v2" or separate project
- Remember: No localStorage/sessionStorage in artifacts - use state management appropriately

### Session Continuity
- **Session 1 (Jan 17, 2025)**: UX overhaul complete
  - Implemented BorrowRequest model with two-step returns
  - Reorganized frontend to 3-page structure
  - Added edit tool functionality
  - Identified 7 quick-win polish features for TIER 0
  - Plan file: `C:\Users\swill\.claude\plans\agile-giggling-kite.md`

- **Session 2 (Jan 19, 2025)**: TIER 0 polish features complete + OAuth2 started
  - All 7 quick-win UX improvements implemented
  - Owner names on tool cards, notification badges, search/filter, pending counts, message previews, due date presets, empty states
  - Fixed white-on-white text bug in success message boxes
  - Started OAuth2 implementation (TIER 1)

- **Session 2 continued (Jan 19, 2025)**: OAuth2 implementation complete
  - Backend auth system: JWT tokens, Google OAuth endpoints, dev bypass login
  - Added `google_sub` field to User model with migration
  - Created auth router with: `/auth/google/login`, `/auth/google/callback`, `/auth/dev/login`, `/auth/me`, `/auth/logout`
  - Created auth service with JWT token creation/validation
  - Frontend auth flow: AuthContext, LoginPage, token storage in localStorage
  - Replaced user selector dropdown with proper login/logout flow
  - Login page supports both Google OAuth and dev bypass login
  - Dev login tested and working (alice@example.com, bob@example.com, etc.)
  - Installed missing dependencies: httpx, python-jose, email-validator

- **Session 3 (Jan 20, 2025)**: Geocoding backend complete
  - Added geocoding fields to User model (home_address, home_lat, home_lng)
  - Added geocoding fields to Tool model (address, lat, lng) - renamed from 'location'
  - Created geocoding service using OpenStreetMap Nominatim (free, no API key)
  - Created `/geo/geocode` endpoint (POST, converts address to lat/lng)
  - Created `/geo/tools/near` endpoint (GET, radius search with Haversine distance)
  - Created migration `20250120_add_geocoding_fields.py`
  - Updated tool schemas to use 'address' instead of 'location'

- **Session 4 (Jan 27, 2025)**: Geolocation frontend + Docker setup
  - **Leaflet map integration**:
    - Installed leaflet, react-leaflet, @types/leaflet
    - Created `ToolsMap` component with OpenStreetMap tiles and tool markers
    - Added map to Browse Tools page showing tool locations with popups
  - **"Tools near me" feature**:
    - Browser geolocation support (navigator.geolocation)
    - Nearby mode toggle button with radius selector (5/10/25/50/100 km)
    - Calls `/geo/tools/near` API endpoint when enabled
    - User location shown as red marker with green radius circle on map
    - Distance displayed on tool cards and map popups
    - Error handling for denied permissions, unavailable location, timeouts
  - **Address geocoding in forms**:
    - Updated CreateToolForm: renamed `location` to `address`, added lat/lng fields
    - Updated EditToolForm: same address/lat/lng changes
    - Both forms have "Lookup" button that calls `/geo/geocode` API
    - Shows resolved coordinates after lookup, clears when address is edited
  - **Docker + PostgreSQL setup**:
    - Created `backend/Dockerfile` (Python 3.11-slim, uvicorn)
    - Created `docker-compose.yml` (PostgreSQL 15 + backend with hot-reload)
    - Created `backend/.dockerignore`
    - Created `backend/.env.example` template
    - Fixed `requirements.txt` encoding (was UTF-16, now clean UTF-8)
    - Added missing deps: httpx, python-jose, email-validator

- **Session 5 (Jan 30, 2025)**: Map bugfixes + Docker/PostgreSQL fully working
  - **Map bugfixes**:
    - Map now always displays (even with no tools), centered on Helsinki by default
    - Default zoom changed from country-level (4) to city-level (12)
    - Removed conditional that hid map when `filteredTools` was empty
  - **Geocoding auth fix**:
    - Removed auth requirement from `/geo/geocode` endpoint (no user context needed)
    - Changed `/geo/tools/near` to use `get_optional_current_user` (won't 401 without token)
  - **Backend lat/lng persistence fix**:
    - Added `lat` and `lng` fields to `ToolCreate` and `ToolUpdate` schemas
    - Updated `create_tool` and `update_tool` endpoints to save lat/lng from payload
    - Previously frontend sent lat/lng but backend silently ignored them
  - **Docker + PostgreSQL fully working**:
    - Fixed `requirements.txt` encoding (UTF-16 → UTF-8, again)
    - Fixed `DATABASE_URL` dialect: `postgresql+psycopg://` (psycopg v3, not psycopg2)
    - Remapped Docker PostgreSQL host port to 5433 (5432 already in use by local PostgreSQL)
    - Fixed migration PostgreSQL compatibility:
      - Boolean `server_default=sa.text("1")` → `sa.text("true")`
      - Added `RETURN_PENDING` and `RETURNED` to enum in borrow_requests migration
    - All 7 migrations run successfully on PostgreSQL
    - Verified: health, dev login, geocoding, tool creation with lat/lng all working

- **Session 6 (Jan 31, 2025)**: Auth cleanup + tool image plan
  - **Create tool now uses authenticated user**: Removed `owner_id` from `ToolCreate` schema and CreateToolForm. Backend `POST /tools` uses `get_current_user` dependency to set owner from JWT token. No more manual Owner ID input.
  - **Tool images approach decided**: Using pre-made curated icon library (Option B) instead of user uploads to avoid content moderation issues. Icons stored in S3, Lambda processes them for thumbnails — demonstrates full S3 + Lambda pipeline without moderation risk.

- **Next Steps**:
  1. **Tool image icons** - Curated icon set in S3, icon picker UI, Lambda thumbnail generation
  2. **Lambda functions** - image processing (linked to icons), overdue reminders
  3. **AI integration** - Smart Tool Helper (Vercel AI SDK)
  4. **Google OAuth setup** (optional - dev login works)
  5. **AWS CDK infrastructure** - deploy to production

---

## Ideas for Later

*Features and enhancements to consider after core functionality is complete. These are not committed to the current scope but worth revisiting.*

1. **Map Popup Borrow Action**
   - Add a "Request to Borrow" button inside map marker popups
   - Clicking navigates to the full borrow request form (with calendar date pickers etc.)
   - Provides a more integrated map-first browsing experience

2. **Calendar View for Borrows/Lends**
   - Visual calendar showing borrow and lending activity
   - Color-coded entries: one color for items you're borrowing, another for items you're lending out
   - Could show due dates, pickup dates, return dates at a glance
   - Helps users plan around their tool availability
   - Potential libraries: react-big-calendar, FullCalendar, or custom with date-fns

