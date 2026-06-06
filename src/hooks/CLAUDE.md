# src/hooks/ — L2 Module Doc

## Files

| File | Responsibility |
|------|---------------|
| `useRecipeStore.js` | Central dish-library store. On mount: hydrates from backend (`fetchLibrary`); migrates local-only data to backend if remote is empty; falls back to `local-only` if offline. Exposes `syncState` (`syncing`/`synced`/`local-only`), `importLibrary`, `replaceAll`, `exportData`, plus full CRUD for dishes, categories, and cooking queue. Debounces push to backend (800ms). |
| `useImportBackup.js` | Import flow: parses a JSON backup file (`parseBackup`), runs `mergeLibrary` against current dishes, prompts `ImportConflictModal` on conflicts, then calls `importLibrary`. Consumed by `CookingQueue`. |
| `useWobbly.js` | Generates randomised CSS transform styles for the wobbly card aesthetic. |
