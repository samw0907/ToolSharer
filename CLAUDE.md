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

### Auth & User (TODO)
- `GET /auth/google/login` - Redirect to Google OAuth2 (no auth)
- `GET /auth/google/callback` - Handle OAuth callback, create/find user, issue JWT (no auth)
- `GET /me` - Get current user profile (auth required)
- `PUT /me` - Update user profile (auth required)
- `PUT /me/location` - Save home location (auth required)

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
- `POST /tools` - Create a tool
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

**Progress: ~30% Complete** (Updated: Jan 17, 2025)

### ✅ Completed (Session 1 - UX Overhaul)

**Backend:**
- FastAPI app structure with routers, models, schemas, services
- SQLAlchemy ORM + Alembic migrations (5 migrations total)
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
- SQLite (local development)
- Users, Tools, BorrowRequests tables
- Status enum includes RETURN_PENDING

### 🚧 In Progress / Next Up

**Quick Win Polish Features (TIER 0 - Do First!):**

These small features add professional polish with minimal effort:

1. **Show owner name/email instead of "Owner ID"** (5 min)
   - Display `user.email` or `user.full_name` on tool cards
   - Replace "Owner ID: 5" with "Owner: john@example.com"

2. **Notification counts on nav buttons** (15 min)
   - "My Lending (3)" - count of pending requests needing approval
   - "My Borrowing (2)" - count of overdue items or returns pending
   - Visual indicator for actions needed

3. **Basic search/filter on Browse Tools** (20 min)
   - Text input to filter by tool name or description
   - Checkbox to hide unavailable tools
   - Simple client-side filtering for now

4. **Pending request count badge on tools** (10 min)
   - Show "X pending requests" on tool cards when they exist
   - Helps set expectations before requesting

5. **Request message preview on Browse Tools** (10 min)
   - When you have a pending request, show your message preview
   - Helps remember what you asked for

6. **Due date quick presets** (15 min)
   - Add preset buttons: "1 day", "3 days", "1 week", "2 weeks"
   - Keep custom date picker as fallback
   - Faster borrowing workflow

7. **Empty states with helpful messages** (10 min)
   - "No tools available yet. Be the first to share!" + [Add Tool] button
   - "No pending requests. Check back soon!"
   - Guides users on what to do next

**Estimated Total: 1.5 hours for significant UX improvement**

---

**Immediate Priority (TIER 1):**
1. OAuth2 with Google (remove user selector)
2. Database schema updates (add missing fields for geocoding)
3. Docker + PostgreSQL setup
4. Lambda functions (image processing, overdue reminders)

**Secondary Priority (TIER 2):**
5. Geospatial features (geocoding, maps, radius search)
6. AI integration (Smart Tool Helper)

**Deployment (TIER 3):**
7. AWS CDK infrastructure
8. Deploy to production

### 📝 Design Decisions Made

- **BorrowRequest model** instead of simple ToolLoans (more realistic approval workflow)
- **Two-step return process** for better accountability (borrower initiates, owner confirms)
- **3-page frontend** for clearer mental model
- **Integer IDs** instead of UUIDs for v1 simplicity
- **SQLite** for local dev (will migrate to PostgreSQL before deployment)

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

- **Next Session**: Implement TIER 0 polish features (7 small UX improvements, ~1.5 hours total)
  - Start with #1 (owner names) and work through the list
  - Then proceed to TIER 1 (OAuth2)
