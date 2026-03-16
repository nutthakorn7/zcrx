# zcrX — Security Scanning Platform

Modern, self-hosted security scanning platform for your code repositories.

## Features

- **SAST** — Static Application Security Testing (powered by Semgrep)
- **SCA** — Software Composition Analysis (npm audit)
- **SBOM** — Software Bill of Materials generation
- **Git Integration** — Clone and scan any Git repository
- **JWT Auth** — Secure user authentication
- **Dashboard** — Severity charts, scan history, findings overview

## Tech Stack

| Layer    | Technology          |
|----------|---------------------|
| Frontend | Next.js 16, React 19 |
| Backend  | Bun, Hono, Drizzle ORM |
| Database | SQLite              |
| Scanning | Semgrep, npm audit  |

## Quick Start

### Local Development

```bash
# Backend
cd backend
bun install
JWT_SECRET=your-secret bun run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Docker

```bash
docker-compose up --build
```

This starts:
- **Frontend** at http://localhost:3000
- **Backend API** at http://localhost:8000

The backend container includes `git` and `semgrep` pre-installed for real scanning.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | — | Required. Secret for JWT signing |
| `PORT` | `8000` | Backend port |
| `DATABASE_PATH` | `./data/zcrx.db` | SQLite database path |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for frontend |

## Project Structure

```
zcrX/
├── backend/
│   ├── src/
│   │   ├── db/          # Schema & database init
│   │   ├── engines/     # SAST, SCA, SBOM, Git engines
│   │   ├── middleware/   # JWT auth middleware
│   │   └── routes/      # API endpoints
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/         # Next.js pages
│   │   ├── components/  # Sidebar, Logo, AuthLayout
│   │   └── lib/         # API client, Auth context
│   └── Dockerfile
└── docker-compose.yml
```

## License

MIT
