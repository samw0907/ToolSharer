# ToolSharer

ToolSharer is a cloud-native platform for sharing, discovering, and managing physical tools between users.  
The application is built with a modern AWS-focused architecture to demonstrate full-stack, backend, and cloud skills.


## High-Level Features (Planned)
- User authentication and identity management via OAuth2 / OpenID Connect with Amazon Cognito
- Users can list tools they own, set availability, upload images
- Search tools by location, category, availability window
- Booking flow: request → owner accepts → track status
- Geospatial searching (radius or map-based) — Phase 2
- Background processing (e.g., notifications) using AWS SQS
- Secure media uploads to Amazon S3
- Deployment to AWS ECS Fargate

## Tech Stack

### Frontend
- React + TypeScript
- Vite for dev/build tooling
- React Router
- CSS
- Token handling for OAuth2/OIDC (Auth Code + PKCE)

### Backend
- Python 3.12+
- FastAPI
- PostgreSQL (RDS)
- SQLAlchemy ORM + Alembic migrations
- OAuth2/OIDC token validation using Amazon Cognito JWKs
- S3 for media uploads
- SQS for asynchronous background tasks (notifications, cleanup)

### Infrastructure
- AWS Cognito (user identities)
- AWS RDS PostgreSQL
- AWS ECS Fargate (containers)
- AWS S3 (uploads)
- AWS SQS (async tasks)
- AWS CloudWatch (logs/metrics)
- GitHub Actions CI/CD (build → test → deploy)