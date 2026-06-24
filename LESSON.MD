# LESSON.MD

## Purpose
This file is the project memory for the reading journal app. Every new session should read this first so work stays aligned with the app's real goal: let the user save reading records, fetch book metadata, and keep a diary-like history.

## What Works
- Local-first web app with no login.
- Book lookup through Open Library by title or ISBN.
- Saved diary entries with read date, notes, rating, and tags.
- Search, delete, and summary stats for the journal.
- Modular `src/` structure for lookup, state, UI, and utilities.

## Success Factors
- Keep the core loop fast: enter book, fetch metadata, save reflection.
- Prefer low-friction defaults and clear empty/error states.
- Preserve local storage reliability across refreshes.
- Keep the code split by responsibility so future work stays maintainable.
- Make the experience feel like a personal reading log, not a generic task list.

## Failure Log
- A single-file implementation made future changes harder to reason about.
- If metadata lookup fails, the app must still save the user's reflection instead of blocking them.
- Mixed product and engineering decisions in one place caused confusion; separate them.
- Overcomplicating the first version would slow down the user's main habit of logging books.

## Recent Decisions
- The app now uses a search-first flow: find related books, select one, then write the diary entry.
- The diary form stays disabled until a book is selected to keep the interaction clear.
- Naver Book Search is now the primary metadata source, with a local proxy server to protect API credentials.
- Render is the preferred deployment target for iPhone testing because it gives the app a public HTTPS URL.
- The home screen now keeps reading stats light and moves optional reference content into a separate panel.
- JSON export/import is the preferred recovery path for backups instead of relying on the browser alone.

## Working Rules For Future Sessions
1. Read this file first.
2. Read the relevant agent file in `agents/`.
3. Inspect the current source before changing anything.
4. Make the smallest change that improves the real user workflow.
5. Update this file when a decision, failure, or success pattern matters for later work.

## Next Useful Directions
- Improve edit/review flow for existing entries.
- Add import/export for reading history.
- Add richer summaries such as monthly reading pace or completion trends.
- Keep all future features secondary to fast book logging and reflection.

## Update Template
When a session discovers something important, add a short note in one of these forms:
- `Success: ...`
- `Failure: ...`
- `Decision: ...`
- `Risk: ...`
