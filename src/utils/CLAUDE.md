# src/utils/ — L2 Module Doc

## Files

| File | Responsibility |
|------|---------------|
| `recipeBackup.js` | Pure backup utilities: `buildBackup(dishes, categories)` → backup object v1; `parseBackup(text)` → validates version/shape and returns `{dishes, categories}`; `nameSimilarity(a, b)` → Dice-coefficient bigram similarity [0,1]; `mergeLibrary(current, incoming, threshold=0.8)` → `{merged, conflicts}`. |
| `ingredientNormalizer.js` | Merges ingredients across dishes for the shopping-list view. |
| `recipeParser.js` | Parses raw recipe text into structured objects. |
| `subtitleParser.js` | Parses subtitle/SRT formats. |
| `unitConverter.js` | Converts and normalises measurement units. |
| `pipeline.js` | Orchestrates multi-step parse pipeline. |
| `dishDraft.js` | Edit-draft helpers: `emptyIngredient()` — blank ingredient row template (preserves unit field); `normalizeDishDraft(draft, fallbackName)` — trims/filters draft before save. |
| `ingredientColors.js` | `CAT_COLORS` — shared ingredient-category → colour-token map; consumed by DishEditor, DishDetailBody, ResultsView, CookingQueue. |
| `recipeBackup.test.js` | Vitest unit tests for `recipeBackup.js`. |
