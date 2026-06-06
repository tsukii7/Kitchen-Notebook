# src/api/ — L2 Module Doc

## Files

| File | Responsibility |
|------|---------------|
| `dishesApi.js` | Fetch wrappers for the dish-library backend: `fetchLibrary()` (`GET /api/dishes`) and `pushLibrary({dishes, categories})` (`PUT /api/dishes`). Both apply a 4-second AbortController timeout. Consumed by `useRecipeStore`. |
