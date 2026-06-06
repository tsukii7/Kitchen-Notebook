# Kitchen Notebook — L1 Global Map

## Tech Stack
- **Frontend**: React 18 + Vite, ESM, i18next, framer-motion, lucide-react
- **Backend**: Node.js (ESM), Express 4, Google Gemini API
- **Storage**: localStorage (client) + atomic JSON files in `server/data/users/<userId>.json` (server)
- **Testing**: Vitest

## Architecture
Single-page app with an Express backend. The frontend talks to the backend for:
1. AI endpoints (transcribe / OCR / parse-recipe) via Gemini.
2. Library persistence (`GET/PUT /api/dishes`) — the backup persistence feature added in `feat/recipe-backup-persistence`.

## Directory Overview
| Path | Responsibility |
|------|---------------|
| `server/` | Express API server (Gemini + dish persistence) |
| `src/api/` | Thin fetch wrappers for the backend |
| `src/hooks/` | React hooks: store management, import flow |
| `src/utils/` | Pure-function utilities: backup, parsing, normalization |
| `src/components/` | React UI components |
| `src/styles/` | CSS modules |

## Key Decisions
- **Multi-user seam**: `getUserId()` in `dishesStore.js` is a stub returning `"default"`. Replace with real auth when needed.
- **Atomic writes**: `writeLibrary` uses a `.tmp` file + rename (Windows EPERM fallback: copy+unlink).
- **Backup format v1**: `{version:1, exportedAt, dishes, categories}` — version field gates parseBackup.
- **Dice-coefficient similarity** (threshold 0.8) used by `mergeLibrary` for fuzzy name dedup on import.

## Red Lines (from CLAUDE.md)
- File ≤ 800 lines, function ≤ 30 lines, nesting ≤ 3, branches ≤ 3 per function.
