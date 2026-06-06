# server/ — L2 Module Doc

## Files

| File | Responsibility |
|------|---------------|
| `index.js` | Express server entry: Gemini routes (`POST /api/transcribe`, `POST /api/ocr`, `POST /api/parse-recipe`), health check, and dish-library routes (`GET /api/dishes`, `PUT /api/dishes`). Serves frontend static files in production. |
| `dishesStore.js` | Atomic JSON persistence for the dish library. Exports `getUserId(req)` (multi-user stub → `"default"`), `readLibrary(userId)`, `writeLibrary(userId, {dishes, categories}, updatedAt)`. Data stored at `server/data/users/<userId>.json`. |
| `dishesStore.test.js` | Vitest unit tests for `dishesStore.js` (read/write/atomic-replace). |

## Data Layout
```
server/data/users/
  default.json   ← { dishes, categories, updatedAt }
```
