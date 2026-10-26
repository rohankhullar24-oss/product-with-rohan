# CarBecho: full source code

This bundle holds CarBecho, the used-car inspection co-pilot from
product-with-rohan (Next.js App Router + Supabase + Gemini).

## Routes
- `/carbecho`: the interactive flow. Job list → verify & pair → 200-point checklist (8 sections, 40 rows, Yes/No) → report.
  - `CarBechoFlow.tsx`: the flow and the checklist.
  - `InspectionChat.tsx`: the AI chat sheet (text, voice and photo). A reply can mark a checklist row.
- `/inspector`: the voice-only co-pilot. You ask one question and get one answer.
- `/inspector/history`: the shared findings log, with search and filters.
- `POST /api/inspector`: calls Gemini (`gemini-2.5-flash`, then `gemini-3.5-flash-lite` on 429/503).
- `GET /api/inspector/findings`: reads the findings log.

## Shared lib
- `src/lib/inspector/flow.ts`: sections, jobs, palette and `resolveChecklistItem` (fuzzy-matches a reply to a row).
- `src/lib/inspector/prompt.ts`: the Gemini system prompt and constants.
- `src/lib/inspector/store.ts`: saves findings to Supabase.
- `src/lib/rate-limit.ts`, `src/lib/supabase/{admin,public}.ts`: helpers.

## Setup
1. Create a Next.js app (TypeScript, Tailwind, `@/` → `src/` alias) and run `npm i @supabase/supabase-js`.
2. Copy `src/` into the project.
3. Run `schema.sql` in the Supabase SQL editor.
4. Put these in `.env.local`:
   ```
   GEMINI_API_KEY=...
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
5. Run `npm run dev` and open http://localhost:3000/carbecho
