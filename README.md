# OpenAI Assistants API Demo

A demo application showcasing OpenAI Assistants API function call capabilities with ICTLife integration.

## Project Structure

```
chat-assignment-poc/
├── server/              # Node.js backend (plain JavaScript)
│   ├── server.js        # Express server with API routes
│   └── package.json
├── client/              # React frontend (TypeScript)
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── utils/       # Utility functions
│   │   ├── hooks/       # Custom React hooks
│   │   ├── App.tsx      # Main app with routing
│   │   └── main.tsx
│   └── package.json
└── package.json         # Root package.json with scripts
```

## Requirements

- Node.js 18+ (for native fetch API support)

## Setup

1. Install all dependencies:

```bash
npm run install-all
```

2. Start both server and client:

```bash
npm run dev
```

Or start them separately:

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend
npm run client
```

## Usage

1. Open the application in your browser (usually http://localhost:3000)
2. Enter your API keys on the home page:
   - OpenAI API Key
   - ICTLife API Key
   - ICTLife User ID (numeric)
3. Click "Continue" - keys are saved to localStorage and you're redirected to `/orgs`
4. Browse organizations (groups) vertically with pagination
5. Click an organization to view its assistants at `/org/:uuid/assistants`
6. Select an assistant from the sidebar to view details and start chatting
7. Chat messages persist in URL params for page reload support

## Routes

- `/` - Home page with API key form
- `/orgs` - Organizations list with pagination
- `/org/:uuid/assistants` - Assistants page with sidebar and chat

## API Endpoints

### Backend (http://localhost:3001)

All endpoints now require API keys in request headers:

- `X-OpenAI-Key` - OpenAI API key
- `X-ICTLife-Key` - ICTLife API key
- `X-ICTLife-User-Id` - ICTLife user ID

- `GET /api/groups` - Fetch groups from ICTLife API
- `GET /api/groups/:groupUuid/assistants` - Fetch assistants for a group
- `GET /api/assistants/:assistantId` - Fetch assistant details from OpenAI
- `POST /api/assistants/:assistantId/tools` - Add the `assign_chat_to_agent` function to an assistant (preserves existing tools)
- `GET /api/agents` - Fetch available agents (mock data: agent_id, agent_name, agent_role)
- `POST /api/functions/assign_chat_to_agent` - Execute assign_chat_to_agent (two-step: first call returns agents, second call runs assignment with selected_agent)
- `POST /api/threads` - Create a new conversation thread
- `GET /api/threads/:threadId/messages` - Get thread messages
- `POST /api/threads/:threadId/messages` - Add message to thread
- `POST /api/threads/:threadId/runs` - Run assistant on thread (adds additional_instructions when assistant has assign_chat_to_agent)
- `GET /api/threads/:threadId/runs/:runId` - Get run status
- `POST /api/threads/:threadId/runs/:runId/submit-tool-outputs` - Submit tool outputs and poll until completion
- `GET /api/health` - Health check

## Features

- ✅ Modern UI with centered form and clean design
- ✅ localStorage persistence for API keys
- ✅ React Router for navigation
- ✅ Vertical organizations list with pagination
- ✅ Sidebar layout for assistants
- ✅ Assistant details display from OpenAI
- ✅ Chat interface with thread management
- ✅ URL params for assistant/thread persistence
- ✅ Toast notifications for errors
- ✅ Error boundary for error handling
- ✅ Loading, empty, and error states
- ✅ Logout functionality
- ✅ **Chat Assignment capability**: Optional `assign_chat_to_agent` function can be added to an assistant from the details panel. When enabled:
  - Button "Enable Chat Assignment capability" shows an accordion with function schema and "Add Function".
  - The function uses a **two-step flow**: (1) Assistant calls with user_message → system returns list of agents; (2) Assistant selects best match and calls again with selected_agent → server runs assignment and returns confirmation. The Assistant then informs the customer which agent was assigned.
  - Run creation automatically adds `additional_instructions` when the assistant has this function. Frontend handles `requires_action` by calling the function endpoint and submitting tool outputs.

## Deploying to Vercel (full app: frontend + backend)

The app is set up to deploy as a **single Vercel project** (client and server together).

### What’s in place

- **Root directory**: Use the repo root (`./` or `assistants-function-calling`). Do **not** choose `client` or `server` alone.
- **Build**: Root `npm run build` builds the React client (Vite) into `client/dist`.
- **Backend**: On Vercel, the Express server in `server/` is run as a serverless function via `src/server.js`, which also serves the built client for `/` and SPA routes. API routes stay under `/api/*`.

### Vercel project settings

In **Build and Output Settings**:

| Setting              | Value                                                                                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework Preset** | Other                                                                                                                                                                                                 |
| **Root Directory**   | `./` (leave as repo root)                                                                                                                                                                             |
| **Build Command**    | `npm run build` (or leave default; root `package.json` has `build`)                                                                                                                                   |
| **Output Directory** | `client/dist` (set in `vercel.json`). Vercel expects a build output; the client build produces this. The Express app in `src/server.js` runs as the serverless function and also serves these assets. |
| **Install Command**  | `npm run install-all` (so root, server, and client dependencies are installed)                                                                                                                        |

If the UI suggests “Override” toggles, you can set:

- **Install Command**: `npm run install-all`
- **Build Command**: `npm run build`

### Deploy steps

1. Push the repo to GitHub and [import it as a new Vercel project](https://vercel.com/new).
2. Set **Root Directory** to the repo root (e.g. `assistants-function-calling` if that’s the root).
3. Set **Install Command** to `npm run install-all` and **Build Command** to `npm run build`.
4. (Optional) Add any env vars your server or client need in **Environment Variables** (e.g. for the server; API keys are still sent from the client via headers).
5. Deploy. The same URL will serve the React app and `/api/*` (e.g. `https://your-project.vercel.app` and `https://your-project.vercel.app/api/health`).

### Local vs Vercel

- **Local**: `npm run dev` runs the Vite dev server (port 3000) and the Express server (port 3001) with the proxy in `client/vite.config.ts`.
- **Vercel**: One serverless function runs the Express app; it serves the built client from `client/dist` and handles `/api/*`. No separate “output directory” is used for the frontend; `vercel.json` sets `outputDirectory` to `client/dist` so the build step passes; the Express app serves those assets.

## Security Notes

- API keys are stored in browser localStorage (for demo purposes only)
- Keys are sent in request headers to the backend
- In production, implement proper authentication and secure storage
