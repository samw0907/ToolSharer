# ToolSharer Backend

This is the FastAPI backend powering the ToolSharer platform.  
It provides authentication integration, resource APIs, booking logic, background processing, and secure communication with AWS services.

## Tech Stack

- Python 3.12+
- FastAPI
- PostgreSQL (via AWS RDS)
- **SQLAlchemy ORM** for database models and queries
- **Alembic** for database migrations

### Authentication
- OAuth2 + OpenID Connect via **Amazon Cognito**
- Authorization Code with PKCE flow handled on frontend
- Backend validates Cognito-issued tokens using JWKS
- No custom JWT implementation required

### Background Tasks
- **AWS SQS** for event-based async jobs
- Worker processing via AWS Lambda or ECS task

### File Uploads
- Amazon S3 for storing tool images

## Endpoints (planned)
- `/auth/callback` – Process login redirect from Cognito
- `/users` – Get/update authenticated user
- `/tools` – CRUD operations for user tools
- `/tools/search` – Location/category based search
- `/bookings` – Create/approve/reject bookings
- `/notifications` – (event-based, SQS triggered)
