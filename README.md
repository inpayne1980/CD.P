# ClipDrop.pro

**Drop a link. Get viral clips.**

## Setup
1. **Supabase**: Create project, run `supabase/schema.sql`, get Keys.
2. **Env**: Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Storage**: Ensure 'results' bucket is public.
4. **Worker**: Deploy `worker/process_clip.py` to a VPS or dyad.sh. Install requirements (`yt-dlp`, `whisper`, `moviepy`, `supabase`).
5. **Run**: `npm install && npm run dev`.

Built with Next.js 14, Tailwind, Supabase.