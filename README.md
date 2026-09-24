# AI-ChatBot

## Project Plan: Gemini Chatbot (React + Python)

This repository will be used to build and deploy a chatbot app where users can sign in with email and chat with Gemini (send messages and receive responses).

### 1) Scope and Functional Requirements
- Build a **React frontend** for a unique chat experience.
- Build a **Python backend** to securely call the Gemini API.
- Support **email-based user authentication**.
- Allow authenticated users to:
  - send prompts to Gemini,
  - receive and display Gemini responses,
  - view their own chat sessions/history (optional phase 2 enhancement).
- Deploy frontend + backend to production with environment-based configuration.

### 2) Suggested Architecture
- **Frontend (React)**
  - React + Vite (or Next.js React stack if SSR is needed later).
  - UI modules:
    - Auth screens (email sign up / sign in),
    - Chat workspace (message list, input composer, typing/stream states),
    - Profile/session controls.
- **Backend (Python)**
  - FastAPI service with endpoints:
    - `POST /auth/signup`
    - `POST /auth/login`
    - `POST /chat/send`
    - `GET /health`
  - Gemini integration through official Google Generative AI SDK.
  - JWT-based session handling after email authentication.
- **Data layer**
  - Start with SQLite for local dev; move to PostgreSQL for production.
  - Core tables: users, chats, messages, refresh_tokens (if used).

### 3) Authentication Plan (Email-Based)
- Use email + password authentication with secure password hashing (bcrypt/argon2).
- Validate email format and enforce strong password rules.
- Return signed JWT access token on successful login.
- Protect chat endpoints with auth middleware.
- Add password reset flow in phase 2 (token + email provider integration).

### 4) Gemini Chat Flow
1. Authenticated user submits a prompt in React UI.
2. Frontend sends prompt + auth token to Python `POST /chat/send`.
3. Backend validates token and forwards prompt to Gemini API.
4. Backend returns Gemini response to frontend.
5. Frontend appends both user + assistant messages in conversation view.

### 5) Unique UI Direction
- Use a custom visual identity rather than default chat templates:
  - Gradient theme + branded message bubbles,
  - Animated typing indicator + response transition,
  - Context sidebar for conversation metadata,
  - Accessibility-first color contrast and keyboard navigation.
- Build reusable design tokens (colors, spacing, typography) for consistent styling.

### 6) Deployment Plan
- **Frontend deployment**: Vercel or Netlify.
- **Backend deployment**: Render, Railway, or Fly.io for FastAPI.
- **Database**: managed PostgreSQL (Neon/Supabase/Render Postgres).
- Configure production environment variables:
  - `GEMINI_API_KEY`
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `CORS_ALLOWED_ORIGIN`
- Add CI checks (lint + tests) and auto-deploy from main branch.

### 7) Delivery Milestones
1. Initialize React + FastAPI apps and shared API contract.
2. Implement email auth and protected routes.
3. Integrate Gemini send/receive flow.
4. Build and polish unique chat UI.
5. Add tests (auth, chat endpoint, frontend core flows).
6. Deploy staging, validate end-to-end, then deploy production.