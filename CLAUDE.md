# thefamgroup Admin — Claude Code Instructions

## What this is
Full-stack admin back-office for thefamgroup cleaning business.
- **Backend:** NestJS + TypeORM + PostgreSQL (port 4000)
- **Frontend:** Next.js 15 App Router + Tailwind CSS (port 3001)

---

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in DB credentials
npm install
npm run start:dev             # → http://localhost:4000/api
# Swagger: http://localhost:4000/api/docs

# 2. Frontend
cd frontend
npm install
npm run dev                   # → http://localhost:3001
# Login: admin@thefamgroup.co.uk / Admin@123!
```

---

## Project structure

```
backend/src/
├── main.ts                        # Bootstrap, Swagger, Helmet, CORS
├── app.module.ts                  # Root module
├── common/
│   ├── guards/jwt-auth.guard.ts   # JwtAuthGuard
│   ├── filters/                   # GlobalExceptionFilter
│   └── decorators/                # @Public, @CurrentUser
└── modules/
    ├── auth/                      # JWT login, user seeding
    ├── dashboard/                 # Aggregated stats from all modules
    ├── bookings/                  # CRUD + calendar + stats
    ├── quotes/                    # CRUD + status flow + stats
    ├── leads/                     # CRUD + kanban + stats
    ├── inbox/                     # Messages (WA/email/web) + unread count
    ├── team/                      # CRUD + NMW enforcement + DBS tracking
    └── settings/                  # Key-value config store with defaults

frontend/
├── app/
│   ├── layout.tsx                 # Root (AuthProvider)
│   ├── auth/login/page.tsx        # Login page
│   └── admin/
│       ├── layout.tsx             # Sidebar + topbar (auth guard)
│       ├── dashboard/page.tsx     # Stats + activity
│       ├── bookings/page.tsx      # Table + calendar toggle
│       ├── quotes/page.tsx        # Tabs + status actions
│       ├── leads/page.tsx         # Kanban board
│       ├── inbox/page.tsx         # Three-column inbox
│       ├── team/page.tsx          # Team cards grid
│       └── settings/page.tsx      # Tabbed settings
├── lib/
│   ├── api/client.ts              # Typed fetch wrapper + all API calls
│   ├── hooks/useAuth.tsx          # Auth context + login/logout
│   ├── types/index.ts             # All TypeScript interfaces
│   ├── utils.ts                   # cn(), formatCurrency(), statusColor
│   └── constants.ts               # CONTACT details
```

---

## Design system

Dark theme matching `cleanpro-admin.html`:
- `--bg: #0f0f0f` — page background
- `--surface: #181818` — cards
- `--surface2: #202020` — inputs, hover states
- `--green: #22c55e` — primary accent
- `--green-dim: #16a34a` — green hover

Reusable CSS classes (defined in `globals.css`):
- `.card`, `.card-header`, `.card-body`
- `.btn`, `.btn-sm`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-wa`
- `.input`, `.label`, `.select`, `.textarea`
- `.badge`, `.badge-green`, `.badge-blue`, `.badge-amber`, `.badge-red`, `.badge-grey`
- `.tbl`, `.tbl th`, `.tbl td`, `.td-main`
- `.nav-item`, `.nav-item.active`
- `.stat-card`, `.stat-card.c-green/blue/amber/purple`
- `.toggle`, `.toggle.on`

---

## Auth flow
1. POST `/api/auth/login` → returns `{ accessToken, user }`
2. Token stored in cookie `tfg_token` (1 day, sameSite: strict)
3. All API calls inject `Authorization: Bearer <token>`
4. Admin layout checks `useAuth()` — redirects to `/auth/login` if not authenticated

---

## Key business rules
- UK NMW enforced server-side: hourly rate cannot be set below £11.44
- DBS expiry warning fires 30 days before expiry
- Quote status flow: `draft → sent → accepted/declined → paid | overdue`
- Booking status flow: `pending → confirmed → in_progress → completed | cancelled`
- Lead kanban: `new → contacted → quoted → won | lost`
- Settings seeded on startup with thefamgroup defaults

---

## Adding a new module

**Backend:**
```bash
# 1. Create entity in modules/[name]/entities/[name].entity.ts
# 2. Create DTO in modules/[name]/dto/[name].dto.ts
# 3. Create service, controller, module
# 4. Add module to app.module.ts imports
```

**Frontend:**
```bash
# 1. Add API calls to lib/api/client.ts
# 2. Add TypeScript types to lib/types/index.ts
# 3. Create page at app/admin/[name]/page.tsx
# 4. Add nav item to app/admin/layout.tsx
```

---

## Contact details (never change without instruction)
- Phone: `07769240184`
- Email: `thefamgrouphq@gmail.com`
- Website: `thefamgroup.uk`
- Tagline: Family. Community. Care.

---

## Deployment

**Backend (Railway / Render):**
```bash
npm run build
# Set env vars: DATABASE_URL, JWT_SECRET, NODE_ENV=production, FRONTEND_URL
```

**Frontend (Vercel):**
```bash
# Set: NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
npx vercel
```
