# Team MindMesh — DeepTier

### Multilingual Multi-Tier Supply Risk Intelligence Platform

DeepTier maps the suppliers behind your suppliers and warns Indian retail shops and manufacturing units before upstream disruptions reach them.

---

## Quick Start (Local Development)

### Prerequisites
- **Node.js**: 20+ or 22+ recommended (or [Bun](https://bun.sh))
- **Groq API Key**: Optional for live AI parsing & explanations ([console.groq.com](https://console.groq.com/keys)). If omitted, DeepTier automatically falls back to its offline deterministic rule engine.

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Groq API key:
```env
GROQ_API_KEY="your-groq-api-key"
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build & Run

DeepTier builds into a high-performance, dual-target asset bundle:
1. **Frontend**: Bundled via Vite to static assets in `dist/`.
2. **Backend**: Bundled via esbuild to a single standalone ESM script `server.js`.

```bash
# Build both client and production server
npm run build

# Start production server
npm start
```

---

## Deployment Options

### Option 1: Vercel (Recommended for Serverless)
DeepTier is pre-configured for Vercel with `vercel.json` and serverless functions in `api/`.

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/new), import the repository.
3. Vercel automatically detects the Vite framework and runs `npm run build`.
4. In **Project Settings → Environment Variables**, add:
   - `GROQ_API_KEY`: Your Groq API key.
5. Deploy! Both the SPA and `/api/*` endpoints work out of the box.

### Option 2: Docker / Google Cloud Run / AWS / Railway
DeepTier includes an optimized, multi-stage, secure `Dockerfile` with health checks and an unprivileged runner user.

```bash
# Build the Docker container
docker build -t deeptier .

# Run container locally
docker run -p 3000:3000 -e GROQ_API_KEY="your-groq-api-key" deeptier
```

To deploy to **Google Cloud Run**:
```bash
gcloud run deploy deeptier \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GROQ_API_KEY="your-groq-api-key"
```

### Option 3: Render
A pre-configured `render.yaml` blueprint is included:
1. Connect your repository on [render.com](https://render.com).
2. Choose **Blueprint** and select `render.yaml`.
3. Set your `GROQ_API_KEY` in the environment tab.

### Option 4: Netlify (Frontend-only)
A `netlify.toml` file is provided for static SPA hosting. If you host the frontend on Netlify and point to an external API server, the built-in CORS middleware on DeepTier server handles cross-origin requests automatically.

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npm run dev` | Starts dev server with Vite HMR + Express API on port 3000 |
| `build` | `npm run build` | Builds both the Vite client (`dist/`) and production server (`server.js`) |
| `build:client` | `npm run build:client` | Compiles Vite frontend SPA to `dist/` |
| `build:server` | `npm run build:server` | Bundles `server.ts` to standalone `server.js` with esbuild |
| `start` | `npm start` | Runs the compiled production server `server.js` |
| `lint` | `npm run lint` | Runs `tsc --noEmit` to verify TypeScript types |
| `test` | `npm test` | Runs the deterministic engine scenario test suite |
| `clean` | `npm run clean` | Cross-platform cleanup of `dist/` and `server.js` |

---

## Health Check Endpoint

DeepTier provides a health check endpoint at:
- `GET /api/health`
- `GET /health`

Response:
```json
{
  "ok": true,
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "groqConfigured": true
}
```
Used by Docker healthchecks, Kubernetes liveness probes, AWS load balancers, and Render/Cloud Run health monitoring.
