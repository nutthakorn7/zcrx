# zcrX — Security Scanning Platform

## Design Philosophy: Apple + Tesla
> **"It just works."** — Zero config, one-click, auto-everything, premium UI.

- Paste a Git URL → auto clone, detect, scan
- One button (Full Scan) does SAST + SCA + SBOM
- Auto-seed admin user on first start
- Power user options hidden in dropdowns
- Dark glassmorphism UI with gradient accents

## Tech Stack
- **Frontend:** Next.js 16 (React 19) + Recharts + Lucide Icons
- **Backend:** Bun + Hono (TypeScript)
- **Database:** SQLite (bun:sqlite + Drizzle ORM)
- **Scan Engines:** Semgrep (SAST), npm audit (SCA), custom SBOM
- **Auth:** JWT (bcrypt hashing)
- **Deployment:** Docker + Docker Compose

## Security Features
- **SAST** — Static Analysis via Semgrep (falls back to demo data)
- **SCA** — Dependency vulnerability scanning via npm audit
- **SBOM** — Software Bill of Materials generation
- **Full Scan** — One-click SAST + SCA + SBOM
- **Report Export** — Styled HTML or JSON

## Quick Start
```bash
# Backend
cd backend && bun install && bun run dev

# Frontend
cd frontend && npm install && npm run dev
```
Login: `admin@zcrx.io` / `admin123` (auto-created on first start)

## Docker
```bash
docker-compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
```

## Project Structure
```
backend/
  src/
    db/           # Schema + auto-seed
    engines/      # SAST, SCA, SBOM, Git
    middleware/    # JWT auth
    routes/       # API endpoints (auth, projects, scans, findings, reports)
frontend/
  src/
    app/          # Pages (dashboard, projects, findings, scans, settings, sbom)
    components/   # Sidebar, Logo, AuthLayout
    lib/          # API client, Auth context
```

## AI Instructions
- **UX Priority:** Apple/Tesla simplicity — minimize user input, auto-detect everything
- **Security first** in all code
- **One-click flows** — avoid multi-step wizards
- **TypeScript strict mode** throughout
- When adding features, ask: "Can this be automatic instead of manual?"
