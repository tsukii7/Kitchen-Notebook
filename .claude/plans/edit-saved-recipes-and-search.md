# 设计文档：编辑已保存菜谱（共享 DishEditor）+ 按菜名搜索

- 日期：2026-06-06
- 状态：设计已确认，待写实现计划
- 功能简述：让菜库里的已保存菜可完整编辑（菜名 / 含单位的食材 / 步骤 / 分类），编辑器抽成 ResultsView 与菜库共用的 `DishEditor`（顺带修好旧编辑器丢单位的 bug）；并在菜库加按菜名实时搜索。严格沿用现有 UI，不引入新视觉风格。

---

## 1. 背景与现状

- 菜的形状：`{ _id, dish_name, category, ingredients: [{ name, amount, unit, category }], steps: [string], _savedAt, ... }`。
- **ResultsView**（`src/components/ResultsView.jsx`）已有一个内联食材编辑器：`editModeDishIdx` + `draftIngredients`，但只编辑食材的**名称/数量**，新增食材模板为 `{ name, amount, category }`——**缺 `unit`，导致单位丢失**；且不能改菜名、步骤；只作用于"刚识别的结果"。
- **CookingQueue**（`src/components/CookingQueue.jsx`）的「菜谱详情」弹窗（`activeDish`）目前**只读**：食材+步骤仅展示，仅分类可通过卡片上的选择器改（`updateDishCategory`）。
- **store**（`src/hooks/useRecipeStore.js`）：`saveDish` 按**菜名** upsert；`updateDishCategory` 仅改分类；**没有**按 `_id` 整体更新一道菜的方法。改名场景下用 saveDish 会出错（按名 upsert 会产生重复或错配）。
- 已保存的菜已通过既有的"防抖推送到后端 JSON"机制持久化（上个特性），编辑只要落到 `savedDishes` 状态即会自动同步。

## 2. 目标

1. 在菜库中完整编辑已保存菜：菜名、食材（**保留单位**）、步骤、分类。
2. 食材/步骤支持**增、删、改**（不含拖拽排序）。
3. 编辑器抽成共享 `DishEditor`，ResultsView 与菜库共用；顺带修好 ResultsView 丢单位的 bug，使结果页也能改菜名/步骤。
4. 菜库加**按菜名实时搜索**，与现有分类筛选叠加。
5. **严格保持现有外观**：所有新 UI 复用现有弹窗外壳与控件类，不新增视觉风格、不另起异样窗口。

## 3. 非目标（YAGNI）

- 不做拖拽排序。
- 不做模糊/拼音搜索（仅子串包含）。
- 不做富文本步骤、图片编辑。
- 搜索不触达后端（纯前端过滤）。

---

## 4. 已确认决策

| 决策 | 选择 |
|---|---|
| 编辑器归属 | 抽**共享 `DishEditor`**，ResultsView + 菜库共用；修好 ResultsView 丢单位 bug |
| 编辑操作 | 食材/步骤 **增 / 删 / 改**（无排序） |
| 编辑器字段 | 菜名、分类（从现有 categories 选）、食材（名/量/**单位**/分类）、步骤 |
| 数量输入 | **自由文本**（兼容数字与"适量""少许"） |
| 保存规整 | 菜名空→回退原名/「未命名菜谱」；丢弃无名食材行、空步骤；食材补齐四字段（unit 缺省空串，绝不丢字段） |
| 搜索 | 菜库按**菜名**：大小写不敏感 + 去空格**子串包含**，实时过滤，与分类筛选叠加 |
| 外观 | 复用 `modal-overlay` / `modal-content glass-card` / `useWobbly` / 现有 `btn-*`、输入框类；不引入新样式 |

---

## 5. 组件与模块设计

### 5.1 `src/utils/dishDraft.js`（新增，纯函数，可单测）
- `emptyIngredient()` → `{ name: '', amount: '', unit: '', category: '主料' }`。
- `normalizeDishDraft(draft, fallbackName)` → 返回规整后的菜对象：
  - `dish_name`：trim 后空则用 `fallbackName || '未命名菜谱'`。
  - `category`：原值或 `'未分类'`。
  - `ingredients`：过滤掉 `name` 为空的行；每行规整为 `{ name, amount, unit, category }`（缺失字段补默认；**unit 缺失补 `''`，不丢弃**）。
  - `steps`：trim 后过滤空串。
  - 保留传入的 `_id`、`_savedAt` 等元字段（不在此函数生成 id）。
- 这是本特性唯一含逻辑的单元，走 TDD。

### 5.2 `src/components/DishEditor.jsx`（新增 UI）
- props：`{ dish, categories, onSave, onCancel }`。
- 内部 draft 状态由 `dish` 初始化；食材缺 unit 时初始化为 `''`（兼容历史数据）。
- 区块（全部用现有样式类）：
  - 菜名：文本 `<input>`。
  - 分类：`<select>` 从 `categories`。
  - 食材列表：每行用子组件 `IngredientRow`（名/量/单位 输入 + 分类 select（食材 `CATEGORIES` 来自 `ingredientNormalizer`）+ 删除按钮）；底部「添加食材」按钮（用 `emptyIngredient()`）。
  - 步骤列表：每条子组件 `StepRow`（textarea + 删除）；底部「添加步骤」按钮。
  - 底部：取消 / 保存（保存时调 `onSave(normalizeDishDraft(draft, dish.dish_name))`）。
- 为满足红线（函数 ≤30 行、文件 ≤800 行、嵌套 ≤3），把 `IngredientRow`、`StepRow` 抽为同文件内或相邻的小组件；事件处理函数保持精简。

### 5.3 `src/hooks/useRecipeStore.js`（改）
- 新增 `updateDish(id, newDish)`（useCallback）：
  - `setSavedDishes(prev => prev.map(d => d._id === id ? { ...newDish, _id: id, _savedAt: Date.now() } : d))`。
  - 若 `newDish.category` 非空且不在 `categories` 中，`setCategories` 追加（与 saveDish 行为一致）。
  - 复用既有防抖后端推送（自动同步，无需新增同步代码）。
- 在 return 暴露 `updateDish`。其余 API 不变。

### 5.4 `src/components/CookingQueue.jsx`（改）
- **详情弹窗编辑态**：详情弹窗（`activeDish`）头部加「编辑」按钮 → 切到编辑态渲染 `<DishEditor dish={activeDish} categories={categories} onSave={...} onCancel={...} />`；onSave 调 `updateDish(activeDish._id, normalized)` 后关闭/回只读并 Toast；onCancel 回只读。复用现有弹窗外壳，不改外观。
- **搜索框**：列表区顶部加 `<input>`（现有输入框样式），state `searchTerm`；显示列表在现有分类过滤基础上再按 `normalize(dish_name).includes(normalize(searchTerm))` 过滤（normalize = 去空格 + toLowerCase）。空词显示全部。
- 需从 props/store 取 `updateDish`（经 App 透传）。

### 5.5 `src/components/ResultsView.jsx`（改）
- 用 `DishEditor` 替换现有残缺的内联食材编辑器（`editModeDishIdx`/`draftIngredients` 一段）：进入编辑渲染 `DishEditor`，onSave 调用现有 `onUpdateDish(idx, normalized)`，onCancel 退出编辑。
- 移除旧编辑器中丢 unit 的逻辑。其余展示不变。

### 5.6 `src/App.jsx`（改）
- 给 `CookingQueue` 透传 `updateDish={store.updateDish}`。
- `ResultsView` 已有 `onUpdateDish`，无需新增（其 `handleUpdateDish` 已重算 shoppingList）。

---

## 6. 数据流与边界

- 编辑保存：DishEditor → `normalizeDishDraft` → `onSave` →（菜库）`store.updateDish(id, dish)` 改 `savedDishes` →（既有）防抖 PUT 到后端 →（既有）localStorage 镜像。
- 结果页编辑：DishEditor → `normalizeDishDraft` → `onUpdateDish(idx, dish)` → App 重算 shoppingList。
- 采购清单合并：菜库合并在打开时按 `queueDishes` 实时 `mergeIngredients`，编辑后自然反映，无需额外处理。
- 单位保留：编辑器每行始终持有 `unit`，`normalizeDishDraft` 补齐而非丢弃 → 保存后单位完整。

## 7. 错误与边界

- 全空菜名 → 回退原名/「未命名菜谱」。
- 无名食材行、空步骤 → 保存时丢弃。
- 历史数据食材无 unit 字段 → 编辑器初始化为 `''`，正常编辑/保存。
- 改名后 → 因按 `_id` 更新，不产生重复条目。

## 8. 测试计划

- **纯函数单测**（`src/utils/dishDraft.test.js`）：`emptyIngredient` 含 unit；`normalizeDishDraft` 覆盖：空名回退、丢无名食材、丢空步骤、unit 缺失补 `''` 保留、四字段补齐、保留 `_id`。
- **手动验证**（运行 app，沿用既有策略，不引入 RTL/jsdom）：
  1. 菜库详情弹窗编辑菜名/食材（含单位）/步骤 → 保存 → 刷新页面仍在（后端持久化）。
  2. 食材增删改、步骤增删改生效。
  3. 改名后无重复条目。
  4. ResultsView 用新编辑器编辑后单位不再丢失。
  5. 搜索框按菜名实时过滤，与分类筛选叠加正确。
  6. 外观与现有弹窗/控件一致（无新样式突兀）。

## 9. 涉及文件清单

- 新增：`src/utils/dishDraft.js`、`src/utils/dishDraft.test.js`、`src/components/DishEditor.jsx`
- 修改：`src/hooks/useRecipeStore.js`（+`updateDish`）、`src/components/CookingQueue.jsx`（编辑入口 + 搜索框）、`src/components/ResultsView.jsx`（换用 DishEditor）、`src/App.jsx`（透传 `updateDish`）
- 文档：相关 L2 模块 `CLAUDE.md` 与新文件 L3 头部同步更新

## 10. UI 一致性约束（硬性）

- 不新增配色/字体/卡片样式；一切复用现有 `glass-card`、`modal-*`、`useWobbly`、`btn-*`、现有输入/选择器类。
- DishEditor 嵌在现有详情弹窗外壳内，不另起样式不同的窗口。
- 搜索框与现有输入框视觉一致。
