# src/components/ — L2 Module Doc

## Files

| File | Responsibility |
|------|---------------|
| `CookingQueue.jsx` | Main dish-library panel: lists saved dishes with category filtering, recipe-name search, queue selection, category management, shopping-list merge modal, detail modal (read-only via `DishDetailBody` / editable via `DishEditor` + `updateDish`), and export/import buttons. Hosts `useImportBackup` and mounts `ImportConflictModal`. |
| `CustomSelect.jsx` | Shared animated dropdown control (value/onChange/options props); extracted from ResultsView, reused by DishEditor for ingredient-category selection. |
| `DishDetailBody.jsx` | Read-only recipe detail view (ingredients + steps) rendered inside the CookingQueue detail modal when not editing. |
| `DishEditor.jsx` | Shared recipe edit form: dish name, dish category, ingredient rows (name/amount/unit/category via CustomSelect), and step rows; add/remove supported. Used by both ResultsView and CookingQueue. |
| `ImportConflictModal.jsx` | Modal for resolving import name conflicts. Renders each `{current, incoming}` pair with three radio choices: keep current / use incoming / keep both. Exports the `CHOICES` constant consumed by `useImportBackup`. |
| `Header.jsx` | App header with navigation and theme toggle. (Note: store exposes `syncState` but no component renders it yet — available for a future sync indicator.) |
| `InputTabs.jsx` | Tabbed input panel (audio upload, OCR, manual text). |
| `PipelineStepper.jsx` | Step-by-step pipeline progress UI. |
| `ResultsView.jsx` | Displays parsed recipe results and save actions; uses shared `DishEditor` for pre-save inline editing of each parsed dish. |
| `Toast.jsx` | Transient notification toasts. |
