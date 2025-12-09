# ToolSharer Frontend

This is the React + TypeScript single-page application for ToolSharer.

The frontend communicates with the FastAPI backend, manages user authentication via OAuth2/OIDC with Amazon Cognito, and provides a clean interface for tool discovery, booking, and management.

## Tech Stack

- React (with hooks)
- TypeScript
- Vite (faster dev server + build)
- React Router
- **CSS modules / plain CSS (no Tailwind)**
- State/query management (React Query planned)
- OAuth2 Authorization Code + PKCE with Cognito

## Key Responsibilities

- Handle user login through Cognito Hosted UI (OAuth2 Auth Code + PKCE)
- Store OAuth2 tokens securely (access + refresh)
- Provide UI for:
  - Listing tools
  - Tool details & availability
  - Bookings workflow
  - User profiles
- API communication with FastAPI backend

