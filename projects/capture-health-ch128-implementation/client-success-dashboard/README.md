# Client Success Dashboard

CSM-facing dashboard for monitoring client health, preventing churn, and managing interventions at Capture Health.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Database:** Supabase (PostgreSQL + Realtime)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Notifications:** Slack webhooks + SendGrid email
- **Testing:** Vitest

## Setup

```bash
npm install
cp .env.local.example .env.local
# Fill in Supabase credentials and optional Slack/SendGrid keys
```

### Database

Run the migrations in order against your Supabase project:

```
supabase/migrations/001_create_clients.sql
supabase/migrations/002_create_health_scores.sql
supabase/migrations/003_create_churn_alerts.sql
supabase/migrations/004_create_interventions.sql
supabase/migrations/005_seed_data.sql
```

## Development

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`.

## Health Score Algorithm

```
Health Score = (Product Usage x 0.40) + (Engagement x 0.30) + (Relationship x 0.20) + (Support x 0.10)
```

Tiers: **Green** (80-100), **Yellow** (50-79), **Red** (0-49)

### Trigger Detection

| Priority | Triggers |
|----------|----------|
| Critical | Login drought (14+ days), NPS detractor (0-6), Support spike (3+ tickets/7d), Feature crash |
| Medium | Declining usage, Missed QBR, CSAT drop (<=3), NPS passive (7-8) |
| Low | Stagnant usage, Single user reliance |

## Cron

Daily health score calculation runs at 6 AM UTC via Vercel Cron:

```bash
# Manual trigger:
curl -X POST http://localhost:3000/api/cron/calculate-health \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Testing

```bash
npm test           # Run once
npm run test:watch # Watch mode
```

## Deployment

Push to main branch for Vercel auto-deploy. The `vercel.json` configures the daily cron job.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── alerts/          # GET/PATCH alerts
│   │   ├── cron/            # Daily health calculation
│   │   └── webhooks/slack/  # Outbound Slack
│   └── dashboard/
│       ├── page.tsx         # Client list
│       ├── [clientId]/      # Client detail
│       └── alerts/          # Alert management
├── actions/                 # Server actions
├── components/
│   ├── dashboard/           # Layout components
│   ├── health/              # Health-specific components
│   └── ui/                  # shadcn/ui primitives
├── hooks/                   # Data fetching hooks
├── lib/
│   ├── health-score/        # Calculator + triggers
│   ├── notifications/       # Slack + email
│   └── supabase/            # Client configs
└── types/                   # TypeScript definitions
```
