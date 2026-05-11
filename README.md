# Reset Loop

Reset Loop is a mobile-first Next.js MVP for low-energy daily resets. It helps users stay consistent with tiny tidy actions, streak protection, and optional mood check-ins.

## Tech stack

- Next.js app router
- React
- Tailwind CSS
- Supabase database
- Mobile-first UI

## What’s included

- `/dashboard/home` main reset experience
- `/progress` progress summary
- `/settings` reminder settings
- Optional post-reset check-in modal
- Check-in trend graph for mood, energy, and pain
- Multiple task entries per day
- Custom task list that feeds future suggestions
- Supabase schema in `supabase/schema.sql`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project and configure your database.

3. Use the SQL in `supabase/schema.sql` to create the required tables.

4. Create a `.env.local` file at the project root with:

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

5. Run the app:

```bash
npm run dev
```

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anonymous API key

## Notes

- The app uses a local browser ID to create or fetch a user profile on first load.
- Daily streaks are protected by either a completed reset or a freeze day.
- Browser notifications are requested when a reminder time is set, with encouraging copy and a 1-2 per day cap.
- The app is designed for quick, tap-only use.
