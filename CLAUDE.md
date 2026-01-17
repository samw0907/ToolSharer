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

### 3. Borrowing & Returning
- Select start date + due date to borrow a tool
- Simple availability check (can't borrow if currently out on loan)
- "My Loans" page showing active loans with due dates
- Return tool button → marks loan as returned
- Loan history (optional)

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

### `tool_loans`
- `id` (uuid, PK)
- `tool_id` (uuid, FK → tools.id)
- `borrower_id` (uuid, FK → users.id)
- `start_date` (date)
- `due_date` (date)
- `returned_at` (timestamptz, nullable) - NULL until returned
- `reminder_sent` (boolean, default false)
- `created_at`, `updated_at` (timestamptz)

### `stats_summary` (for Lambda 3)
- `id` (uuid, PK)
- `snapshot_date` (date)
- `total_tools` (integer)
- `total_active_loans` (integer)
- `loans_last_7_days` (integer)
- `loans_last_30_days` (integer)

---

## API Endpoints

### Health
- `GET /health` - Healthcheck (no auth)

### Auth & User
- `GET /auth/google/login` - Redirect to Google OAuth2 (no auth)
- `GET /auth/google/callback` - Handle OAuth callback, create/find user, issue JWT (no auth)
- `GET /me` - Get current user profile (auth required)
- `PUT /me` - Update user profile (auth required)
- `PUT /me/location` - Save home location (auth required)

### Geocoding
- `POST /geocode` - Convert address to lat/lng (auth required)
  - Body: `{ address: string }`
  - Returns: `{ lat, lng, formatted_address }`

### Tools
- `GET /tools` - List all tools, optional filters (no auth required)
- `GET /tools/{tool_id}` - Get tool details (no auth required)
- `POST /tools` - Create a tool (auth required)
- `PUT /tools/{tool_id}` - Update tool, owner-only (auth required)
- `DELETE /tools/{tool_id}` - Delete tool, owner-only (auth required, optional)
- `GET /me/tools` - List tools owned by current user (auth required)

### Tools - Location-based
- `GET /tools/near?lat=&lng=&radius_km=` - Get nearby tools with distances (auth required)

### Tool Images
- `POST /tools/{tool_id}/image-upload-url` - Get pre-signed S3 URL for upload (auth required)

### Loans
- `POST /tools/{tool_id}/loans` - Create a loan (auth required)
- `GET /me/loans` - List current user's loans (auth required)
- `POST /loans/{loan_id}/return` - Mark loan as returned (auth required)

### AI
- `POST /ai/chat` - Smart Tool Helper chat endpoint (auth required)
  - Streams LLM response back to frontend

### Stats
- `GET /me/summary` - User's summary stats (auth required)
- `GET /stats/summary` - Global stats (optional auth)

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

**Starting Point**: Mid-project jump from ChatGPT. Completed initial planning phase. Ready to begin implementation.

**Next Immediate Steps**:
1. Create project repository structure
2. Set up FastAPI skeleton with Docker
3. Initialize database with Alembic
4. Begin Week 1, Day 1 tasks

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