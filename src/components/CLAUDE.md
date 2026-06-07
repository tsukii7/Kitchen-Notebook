# src/components/ — L2 Module Doc

## Files

| File | Responsibility |
|------|---------------|
| `CookingQueue.jsx` | Main dish-library panel: lists saved dishes with category filtering, queue selection, category management, shopping-list merge modal, recipe-detail modal (read-only via `DishDetailBody`, editable via `DishEditor`), and export/import buttons (导出备份 / 导入备份). Hosts `useImportBackup` and mounts `ImportConflictModal`. |
| `DishDetailBody.jsx` | Read-only recipe detail view (ingredients + steps) rendered inside the CookingQueue detail modal when not editing. |
| `ImportConflictModal.jsx` | Modal for resolving import name conflicts. Renders each `{current, incoming}` pair with three radio choices: keep current / use incoming / keep both. Exports the `CHOICES` constant consumed by `useImportBackup`. |
| `Header.jsx` | App header with navigation and theme toggle. (Note: store exposes `syncState` but no component renders it yet — available for a future sync indicator.) |
| `InputTabs.jsx` | Tabbed input panel (audio upload, OCR, manual text). |
| `PipelineStepper.jsx` | Step-by-step pipeline progress UI. |
| `ResultsView.jsx` | Displays parsed recipe results and save actions. |
| `Toast.jsx` | Transient notification toasts. |
