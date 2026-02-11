# PM Dashboard

A unified project management dashboard for managing multiple businesses. Built with React, TypeScript, Tailwind CSS, and Supabase.

![Dashboard Preview](https://via.placeholder.com/800x400?text=PM+Dashboard+Preview)

## Features

- 🏢 **Multi-Business Support** - Switch between Capture Health, Inspectable, and Synergy
- 📋 **Kanban Board** - Drag-and-drop task management with multiple projects
- 📅 **Calendar Integration** - View and manage events with calendar sync support
- 📝 **Notes & Mindmaps** - Create, link, and visualize notes
- 👥 **Leads Management** - Track leads with status pipeline and value tracking
- 🔗 **Webhook System** - Real-time notifications for external integrations
- 🔐 **Secure Authentication** - Supabase Auth with JWT tokens
- 📱 **Mobile Responsive** - Works great on all devices

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Deployment:** Vercel
- **API:** Vercel Edge Functions

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account

### 1. Clone the repository

```bash
git clone https://github.com/michaeldimuro/pm-dashboard.git
cd pm-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 4. Configure environment variables

```bash
cp .env.local.template .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Start development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (for serverless functions)
4. Deploy!

### GitHub Actions (CI/CD)

The project includes GitHub Actions for automatic deployment:

1. Add secrets to your GitHub repository:
   - `VERCEL_TOKEN` - Your Vercel token
   - `VERCEL_ORG_ID` - Your Vercel org ID
   - `VERCEL_PROJECT_ID` - Your Vercel project ID

2. Pushes to `main` will auto-deploy to production
3. Pull requests will create preview deployments

## Project Structure

```
pm-dashboard/
├── api/                    # Vercel serverless functions
│   ├── health.ts
│   └── webhooks/
├── src/
│   ├── components/         # Reusable UI components
│   │   └── Layout/
│   ├── contexts/           # React contexts
│   ├── lib/                # Utilities (Supabase client)
│   ├── pages/              # Page components
│   │   ├── Auth/
│   │   ├── Calendar/
│   │   ├── Dashboard/
│   │   ├── Kanban/
│   │   ├── Leads/
│   │   ├── Notes/
│   │   ├── Settings/
│   │   └── Webhooks/
│   ├── types/              # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── schema.sql          # Database schema
└── vercel.json
```

## Database Schema

The app uses these main tables:

- `users` - User profiles
- `projects` - Projects per business
- `tasks` - Tasks with status and priority
- `kanban_columns` - Custom kanban columns
- `kanban_items` - Task positions in columns
- `calendar_events` - Calendar events
- `notes` - Notes with colors and tags
- `note_links` - Connections between notes
- `leads` - Lead tracking
- `webhook_subscriptions` - Webhook configurations
- `audit_log` - Activity logging

All tables have Row Level Security (RLS) enabled.

## Webhooks

The webhook system sends POST requests when events occur:

**Supported Events:**
- `task_created` - New task created
- `task_updated` - Task modified
- `task_deleted` - Task deleted
- `calendar_event` - Calendar event created/updated
- `lead_updated` - Lead status changed
- `note_created` - New note created

**Payload Format:**
```json
{
  "event_type": "task_created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "title": "Task title",
    ...
  }
}
```

**Signature Verification:**
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/webhooks/test` | POST | Test a webhook |
| `/api/webhooks/trigger` | POST | Trigger webhooks (internal) |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

MIT License - feel free to use this for your own projects!

---

Built with ❤️ by Michael DiMuro
