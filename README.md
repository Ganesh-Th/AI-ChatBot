# AI-ChatBot

## Project Plan: Gemini Chatbot (React + Python)

This repository will be used to build and deploy a chatbot app where users can sign in with Google and chat with Gemini (send messages and receive responses).

### 1) Scope and Functional Requirements
- Build a **React frontend** for a unique chat experience.
- Build a **Python backend** to securely call the Gemini API.
- Support **Google-based user authentication**.
- Allow authenticated users to:
  - send prompts to Gemini,
  - receive and display Gemini responses,
  - view their own chat sessions/history (optional phase 2 enhancement).
- Deploy frontend + backend to production with environment-based configuration.

### 2) Suggested Architecture
- **Frontend (React)**
  - React + Vite (or Next.js React stack if SSR is needed later).
  - UI modules:
    - Google sign-in screen,
    - Chat workspace (message list, input composer, typing/stream states),
    - Profile/session controls.
- **Backend (Python)**
  - FastAPI service with endpoints:
    - `POST /auth/google`
    - `POST /chat/send`
    - `GET /health`
  - Gemini integration through official Google Generative AI SDK.
  - JWT-based session handling after email authentication.
- **Data layer**
  - Start with SQLite for local dev; move to PostgreSQL for production.
  - Core tables: users, chats, messages, refresh_tokens (if used).

### 3) Authentication Plan (Google-Based)
- Verify Google Identity Services ID tokens on the backend.
- Create or find the user by their verified Google email.
- Return a signed JWT access token on successful Google sign-in.
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
- **Deployment**: one Docker container on Google Cloud Run serving both React and FastAPI.
- **Database**: managed PostgreSQL (Neon or Cloud SQL). SQLite is suitable only for local development because Cloud Run storage is ephemeral.
- Configure production environment variables:
  - `GEMINI_API_KEY`
  - `JWT_SECRET`
  - `DATABASE_URL`
  - `CORS_ALLOWED_ORIGIN`
  - `GOOGLE_CLIENT_ID` (backend)
  - `VITE_GOOGLE_CLIENT_ID` (frontend, same Google OAuth web client ID)
- Add CI checks (lint + tests) and auto-deploy from main branch.

### Google Cloud Run Deployment

From the repository root, set your project and deploy the image with Cloud Build:

```powershell
$PROJECT_ID = "your-google-cloud-project"
$REGION = "us-central1"
$REPOSITORY = "ai-chatbot"
$SERVICE = "ai-chatbot"
$IMAGE = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$SERVICE"

gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create $REPOSITORY --repository-format=docker --location=$REGION

$GOOGLE_CLIENT_ID = "your-google-client-id"
gcloud builds submit --config cloudbuild.yaml --substitutions="_VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,_IMAGE=$IMAGE"
gcloud run deploy $SERVICE --image $IMAGE --region $REGION --allow-unauthenticated --set-env-vars="GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID,GEMINI_API_KEY=your-gemini-key,JWT_SECRET=replace-with-a-long-random-secret,DATABASE_URL=your-postgres-url,CORS_ALLOWED_ORIGIN=*"
```

After deployment, copy the actual Cloud Run URL from the command output and add it as an authorized JavaScript origin in the Google OAuth Web Client settings. Keep `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` set to the same value.

### 7) Delivery Milestones
1. Initialize React + FastAPI apps and shared API contract.
2. Implement email auth and protected routes.
3. Integrate Gemini send/receive flow.
4. Build and polish unique chat UI.
5. Add tests (auth, chat endpoint, frontend core flows).
6. Deploy staging, validate end-to-end, then deploy production.