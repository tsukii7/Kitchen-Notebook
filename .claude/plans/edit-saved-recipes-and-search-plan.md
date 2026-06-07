# 编辑已保存菜谱 + 按菜名搜索 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让菜库里的已保存菜可完整编辑（菜名 / 含单位的食材 / 步骤 / 分类），编辑器抽成 ResultsView 与菜库共用的 `DishEditor`（修好旧编辑器丢单位 bug），并在菜库加按菜名实时搜索。

**Architecture:** 新增纯函数 `dishDraft`（草稿规整，可单测）+ 共享 `DishEditor` 表单组件（复用现有 `CustomSelect`/`CAT_COLORS`/输入样式，容器无关）。store 加按 `_id` 更新的 `updateDish`，复用既有防抖后端推送。CookingQueue 详情弹窗加编辑态 + 顶部菜名搜索框；ResultsView 用 DishEditor 替换残缺的内联食材编辑器。

**Tech Stack:** React 19、Vite 6、Vitest、framer-motion、lucide-react、ESM。

设计依据：`.claude/plans/edit-saved-recipes-and-search.md`。

---

## 关键现状（实现者须知）

- 菜形状：`{ _id, dish_name, category, ingredients:[{name, amount, unit, category}], steps:[string], _savedAt }`。
- `ResultsView.jsx` 现有内联食材编辑器（约 346–408 行）：用 `editModeDishIdx` + `draftIngredients`，只编辑食材名/量/分类，新增模板 `{ name:'', amount:'', category:'主料' }`（**无 unit**）；用 `CustomSelect`（options=`Object.keys(CAT_COLORS)`）和 lucide `Pencil/Trash2/Plus`。它**不编辑菜名/步骤**。
- `CAT_COLORS`、`CustomSelect` 在 `ResultsView.jsx` 中已 import（实现者读该文件顶部确认其来源路径后，在 DishEditor 中按同路径 import）。
- `CookingQueue.jsx`：详情弹窗 `activeDish`（约 568–648 行）只读；已 import `{ mergeIngredients, CATEGORIES } from '../utils/ingredientNormalizer'`、`useWobbly`；用 `modal-overlay`/`modal-content glass-card`/`modal-header/body/footer` 类与 `modalWobble`。
- store `useRecipeStore.js`：有 `saveDish`(按名 upsert)、`updateDishCategory`，无按 `_id` 整体更新；已有防抖后端推送 effect（依赖 `[savedDishes, categories]`），所以改 `savedDishes` 即自动同步。
- 红线（CLAUDE.md）：文件 ≤800 行、函数 ≤30 行、嵌套 ≤3、分支 ≤3。`CookingQueue.jsx` 当前约 771 行——本计划须把搜索/编辑接线做轻，必要时抽小组件，避免越界。

## 文件结构

- 新增：`src/utils/dishDraft.js`、`src/utils/dishDraft.test.js`、`src/components/DishEditor.jsx`
- 修改：`src/hooks/useRecipeStore.js`、`src/App.jsx`、`src/components/ResultsView.jsx`、`src/components/CookingQueue.jsx`
- 文档：`src/utils/CLAUDE.md`、`src/components/CLAUDE.md`、`src/hooks/CLAUDE.md`

---

## Task 1: 草稿规整纯函数 dishDraft（TDD）

**Files:** Create `src/utils/dishDraft.js`, Test `src/utils/dishDraft.test.js`

- [ ] **Step 1: 写失败测试** — create `src/utils/dishDraft.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { emptyIngredient, normalizeDishDraft } from './dishDraft.js';

describe('emptyIngredient', () => {
    it('always includes a unit field (empty string)', () => {
        expect(emptyIngredient()).toEqual({ name: '', amount: '', unit: '', category: '主料' });
    });
});

describe('normalizeDishDraft', () => {
    it('preserves the unit field on ingredients', () => {
        const out = normalizeDishDraft({
            dish_name: '番茄炒蛋',
            category: '素菜',
            ingredients: [{ name: '番茄', amount: '2', unit: '个', category: '蔬菜' }],
            steps: ['切番茄'],
        });
        expect(out.ingredients[0]).toEqual({ name: '番茄', amount: '2', unit: '个', category: '蔬菜' });
    });
    it('fills missing unit with empty string instead of dropping it', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [{ name: '盐', amount: '少许' }], steps: [] });
        expect(out.ingredients[0]).toEqual({ name: '盐', amount: '少许', unit: '', category: '主料' });
    });
    it('drops ingredient rows with blank name', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [{ name: '', amount: '1', unit: 'g' }, { name: '糖', amount: '2', unit: 'g' }], steps: [] });
        expect(out.ingredients).toHaveLength(1);
        expect(out.ingredients[0].name).toBe('糖');
    });
    it('drops blank steps after trim', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [], steps: ['  ', '炒', ''] });
        expect(out.steps).toEqual(['炒']);
    });
    it('falls back to provided fallback name when dish_name is blank', () => {
        const out = normalizeDishDraft({ dish_name: '   ', ingredients: [], steps: [] }, '原菜名');
        expect(out.dish_name).toBe('原菜名');
    });
    it('falls back to 未命名菜谱 when blank and no fallback', () => {
        const out = normalizeDishDraft({ dish_name: '', ingredients: [], steps: [] });
        expect(out.dish_name).toBe('未命名菜谱');
    });
    it('defaults category to 未分类 when missing', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [], steps: [] });
        expect(out.category).toBe('未分类');
    });
    it('preserves passed-through meta fields like _id and _savedAt', () => {
        const out = normalizeDishDraft({ _id: 'x1', _savedAt: 123, dish_name: 'A', ingredients: [], steps: [] });
        expect(out._id).toBe('x1');
        expect(out._savedAt).toBe(123);
    });
});
```

- [ ] **Step 2: 运行确认失败** — Run: `npx vitest run src/utils/dishDraft.test.js` → FAIL (module not found).

- [ ] **Step 3: 实现** — create `src/utils/dishDraft.js`:
```js
/**
 * [IN]: 无外部依赖（纯函数）
 * [OUT]: emptyIngredient/normalizeDishDraft — 编辑草稿的空行模板与保存前规整
 * [POS]: 被 DishEditor 消费；规整结果交给 onSave（store.updateDish 或 onUpdateDish）
 * [PROTOCOL]: 变更食材字段集时同步更新本头部、DishEditor、设计文档
 */
export function emptyIngredient() {
    return { name: '', amount: '', unit: '', category: '主料' };
}

function normalizeIngredient(ing) {
    return {
        name: (ing.name || '').trim(),
        amount: ing.amount ?? '',
        unit: ing.unit ?? '',
        category: ing.category || '主料',
    };
}

export function normalizeDishDraft(draft, fallbackName) {
    const name = (draft.dish_name || '').trim();
    const ingredients = (draft.ingredients || [])
        .map(normalizeIngredient)
        .filter((ing) => ing.name !== '');
    const steps = (draft.steps || [])
        .map((s) => (s || '').trim())
        .filter((s) => s !== '');
    return {
        ...draft,
        dish_name: name || fallbackName || '未命名菜谱',
        category: draft.category || '未分类',
        ingredients,
        steps,
    };
}
```

- [ ] **Step 4: 运行确认通过** — Run: `npx vitest run src/utils/dishDraft.test.js` → PASS (all cases).

- [ ] **Step 5: Commit**
```
git add src/utils/dishDraft.js src/utils/dishDraft.test.js
git commit -m "feat: add dishDraft normalize helper (preserves ingredient unit)"
```

---

## Task 2: store updateDish + App 透传

**Files:** Modify `src/hooks/useRecipeStore.js`, Modify `src/App.jsx`

- [ ] **Step 1: 加 updateDish** — 在 `useRecipeStore.js` 的 `updateDishCategory` useCallback 之后、`return {` 之前插入：
```js
    /** 按 _id 整体更新一道已保存的菜（菜名可变，故不按名匹配） */
    const updateDish = useCallback((id, newDish) => {
        if (newDish.category && newDish.category !== '未分类') {
            setCategories(prev => (prev.includes(newDish.category) ? prev : [...prev, newDish.category]));
        }
        setSavedDishes(prev => prev.map(d =>
            d._id === id ? { ...newDish, _id: id, _savedAt: Date.now() } : d
        ));
    }, []);
```

- [ ] **Step 2: 暴露 updateDish** — 在 `return { ... }` 内追加一行：
```js
        updateDish,
```

- [ ] **Step 3: App 透传给 CookingQueue** — 在 `src/App.jsx` 的 `<CookingQueue ... />` props 里追加（紧挨 `updateDishCategory={store.updateDishCategory}`）：
```jsx
                                updateDish={store.updateDish}
```

- [ ] **Step 4: 验证** — Run: `npx vitest run`（现有测试仍全绿）和 `npm run build`（成功）。

- [ ] **Step 5: Commit**
```
git add src/hooks/useRecipeStore.js src/App.jsx
git commit -m "feat: add updateDish(id, dish) to store and pass to CookingQueue"
```

---

## Task 3: 共享组件 DishEditor

**Files:** Create `src/components/DishEditor.jsx`

实现者须先读 `src/components/ResultsView.jsx` 顶部，确认 `CustomSelect` 与 `CAT_COLORS` 的 import 来源路径，并在 DishEditor 中用**相同路径**导入它们（保持外观/分类选项一致）。`CustomSelect` 的用法见 ResultsView：`<CustomSelect value={...} onChange={val=>...} options={Object.keys(CAT_COLORS)} />`。

- [ ] **Step 1: 实现 DishEditor.jsx**（容器无关的表单；复用现有控件与样式类，函数保持 ≤30 行、嵌套 ≤3）:
```jsx
/**
 * [IN]: react, lucide-react(Plus/Trash2), CustomSelect, CAT_COLORS, dishDraft(emptyIngredient/normalizeDishDraft)
 * [OUT]: DishEditor — 编辑一道菜（菜名/分类/含单位食材/步骤）的共享表单
 * [POS]: 被 ResultsView 与 CookingQueue 复用；onSave 收到规整后的菜对象
 * [PROTOCOL]: 变更字段集时同步更新本头部、dishDraft、相关消费方与设计文档
 */
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
// 实现者：按 ResultsView 中的同一来源路径 import CustomSelect 与 CAT_COLORS
import CustomSelect from './CustomSelect.jsx';
import { CAT_COLORS } from '../utils/ingredientNormalizer.js';
import { emptyIngredient, normalizeDishDraft } from '../utils/dishDraft.js';

const inputStyle = { padding: '0.4rem', border: '2px solid var(--color-ink)', borderRadius: '4px' };

function IngredientRow({ ing, onChange, onRemove }) {
    const set = (field, val) => onChange({ ...ing, [field]: val });
    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="text" value={ing.name} placeholder="食材名" style={{ ...inputStyle, flex: 1 }}
                onChange={e => set('name', e.target.value)} />
            <input type="text" value={ing.amount} placeholder="数量" style={{ ...inputStyle, width: '70px' }}
                onChange={e => set('amount', e.target.value)} />
            <input type="text" value={ing.unit} placeholder="单位" style={{ ...inputStyle, width: '60px' }}
                onChange={e => set('unit', e.target.value)} />
            <CustomSelect value={ing.category} onChange={val => set('category', val)} options={Object.keys(CAT_COLORS)} />
            <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: '0.2rem' }}>
                <Trash2 size={18} />
            </button>
        </div>
    );
}

function StepRow({ value, index, onChange, onRemove }) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 'bold', paddingTop: '0.5rem' }}>{index + 1}.</span>
            <textarea value={value} rows={2} style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
                onChange={e => onChange(e.target.value)} />
            <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: '0.2rem' }}>
                <Trash2 size={18} />
            </button>
        </div>
    );
}

export default function DishEditor({ dish, categories, onSave, onCancel }) {
    const [name, setName] = useState(dish.dish_name || dish.name || '');
    const [category, setCategory] = useState(dish.category || '未分类');
    const [ingredients, setIngredients] = useState(
        (dish.ingredients || []).map(i => ({ name: i.name || '', amount: i.amount ?? '', unit: i.unit ?? '', category: i.category || '主料' }))
    );
    const [steps, setSteps] = useState([...(dish.steps || [])]);

    const setIng = (idx, val) => setIngredients(prev => prev.map((x, i) => (i === idx ? val : x)));
    const setStep = (idx, val) => setSteps(prev => prev.map((x, i) => (i === idx ? val : x)));

    const handleSave = () => {
        const normalized = normalizeDishDraft(
            { ...dish, dish_name: name, category, ingredients, steps },
            dish.dish_name || dish.name
        );
        onSave(normalized);
    };

    return (
        <div className="dish-editor" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span>菜名</span>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span>分类</span>
                <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                    {(categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                    {!(categories || []).includes(category) && <option value={category}>{category}</option>}
                </select>
            </label>

            <div>
                <h5 style={{ margin: '0 0 0.5rem' }}>食材</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ingredients.map((ing, i) => (
                        <IngredientRow key={i} ing={ing} onChange={v => setIng(i, v)}
                            onRemove={() => setIngredients(prev => prev.filter((_, x) => x !== i))} />
                    ))}
                </div>
                <button onClick={() => setIngredients(prev => [...prev, emptyIngredient()])}
                    style={{ marginTop: '0.5rem', background: 'none', border: '2px dashed var(--color-ink-muted)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Plus size={16} /> 添加食材
                </button>
            </div>

            <div>
                <h5 style={{ margin: '0 0 0.5rem' }}>步骤</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {steps.map((s, i) => (
                        <StepRow key={i} value={s} index={i} onChange={v => setStep(i, v)}
                            onRemove={() => setSteps(prev => prev.filter((_, x) => x !== i))} />
                    ))}
                </div>
                <button onClick={() => setSteps(prev => [...prev, ''])}
                    style={{ marginTop: '0.5rem', background: 'none', border: '2px dashed var(--color-ink-muted)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Plus size={16} /> 添加步骤
                </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={onCancel}>取消</button>
                <button className="btn-primary" onClick={handleSave}>保存</button>
            </div>
        </div>
    );
}
```
注意：分类 select 中的 `{!(categories || []).includes(category) && ...}` 一行用于历史/自定义分类不在列表时仍能显示当前值。若 `btn-primary`/`btn-secondary` 在本项目 CSS 不存在，则改用 CookingQueue 里实际使用的按钮类（实现者读 CookingQueue 确认，如 `btn-sm queue-btn`）。

- [ ] **Step 2: 构建校验** — Run: `npm run build` → 成功（JSX 合法）。Run: `npx vitest run` → 现有测试不受影响。

- [ ] **Step 3: 红线检查** — 确认 DishEditor.jsx 各函数 ≤30 行、嵌套 ≤3、文件 ≤800 行。

- [ ] **Step 4: Commit**
```
git add src/components/DishEditor.jsx
git commit -m "feat: add shared DishEditor (name/ingredients-with-unit/steps)"
```

---

## Task 4: ResultsView 改用 DishEditor

**Files:** Modify `src/components/ResultsView.jsx`

- [ ] **Step 1: 读并替换内联编辑器** — 在 `src/components/ResultsView.jsx`：
1. 顶部 import 加：`import DishEditor from './DishEditor.jsx';`
2. 找到 ingredients 区块中 `editModeDishIdx === idx ? (...) : (展示)` 的三元（约 346–427 行）。把**编辑分支**（`editModeDishIdx === idx` 为真时渲染的那个 `dish-ingredients-edit` 大块）整体替换为：
```jsx
                                                {editModeDishIdx === idx ? (
                                                    <DishEditor
                                                        dish={dish}
                                                        categories={[]}
                                                        onSave={(normalized) => { onUpdateDish(idx, normalized); setEditModeDishIdx(null); }}
                                                        onCancel={() => setEditModeDishIdx(null)}
                                                    />
                                                ) : (
```
保留原"展示分支"不变（`: ( ... 展示 ... )`）。
3. 进入编辑的按钮（约 336–343 行 `setEditModeDishIdx(idx); setDraftIngredients(...)`）：去掉 `setDraftIngredients(...)`（不再需要），只保留 `setEditModeDishIdx(idx)`。把按钮文案从"编辑食材"语义保留即可。
4. 由于 DishEditor 现在也渲染步骤编辑，原来编辑分支下方那段只读 `dish-steps`（约 429–436 行）在编辑态会与 DishEditor 的步骤重复 —— 把该只读 `dish-steps` 用条件包起来，仅在**非编辑态**显示：
```jsx
                                                {editModeDishIdx !== idx && (
                                                    <div className="dish-steps" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                        {(dish.steps || []).map((step, si) => ( /* 原内容不变 */ ))}
                                                    </div>
                                                )}
```
5. 清理：若 `draftIngredients` state、`CustomSelect`/`CAT_COLORS`/`Trash2`/`Plus` 等 import 在替换后变为未使用，删除未使用的 state；import 若仍被展示分支使用（如 `CAT_COLORS` 用于 ingredient-tag 颜色）则保留。实现者据实判断，保证无未使用变量告警、无引用缺失。

- [ ] **Step 2: 验证** — Run: `npm run build` → 成功。Run: `npx vitest run` → 全绿。

- [ ] **Step 3: 手动验证（结果页）** — 起 app（`npm run server` + `npm run dev`，独立窗口），文本/图片识别出结果后，对某道菜点编辑：改菜名、给某食材填**单位**、加/删一条步骤 → 确认（保存）→ 该菜展示更新且**单位不丢**；导出/再次查看一致。

- [ ] **Step 4: Commit**
```
git add src/components/ResultsView.jsx
git commit -m "refactor: ResultsView uses shared DishEditor (fixes unit loss, edits name/steps)"
```

---

## Task 5: CookingQueue 详情弹窗加编辑态

**Files:** Modify `src/components/CookingQueue.jsx`

- [ ] **Step 1: 接线编辑态** — 在 `src/components/CookingQueue.jsx`：
1. 顶部 import 加：`import DishEditor from './DishEditor.jsx';`
2. props 解构里加入 `updateDish`（App 已透传）。
3. 加状态：`const [editingDish, setEditingDish] = useState(false);`（编辑态开关；详情弹窗已有 `activeDish`）。
4. 在「菜谱详情」弹窗（`activeDish`）的 header 区，加一个「编辑」按钮（用本组件现有按钮类，如 `btn-sm queue-btn`），点击 `setEditingDish(true)`。
5. 在弹窗 `modal-body` 内，按编辑态切换：
```jsx
                            <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                {editingDish ? (
                                    <DishEditor
                                        dish={activeDish}
                                        categories={categories}
                                        onSave={(normalized) => {
                                            updateDish(activeDish._id, normalized);
                                            setActiveDish(normalized);
                                            setEditingDish(false);
                                            addToast('菜谱已更新', 'success');
                                        }}
                                        onCancel={() => setEditingDish(false)}
                                    />
                                ) : (
                                    /* 原只读展示（ingredients + steps）保持不变 */
                                )}
                            </div>
```
6. 关闭弹窗时重置编辑态：在详情弹窗的 `modal-close` 按钮 `onClick` 里，除 `setActiveDish(null)` 外加 `setEditingDish(false)`。打开新菜进入详情时也确保 `editingDish` 为 false（在设置 `activeDish` 的入口处 `setEditingDish(false)`）。
7. `categories` 已是本组件 props（确认；若没有则从 props 取，App 已传 `categories={store.categories}`）。

- [ ] **Step 2: 验证** — Run: `npm run build` → 成功。Run: `npx vitest run` → 全绿。

- [ ] **Step 3: 手动验证（菜库）** — 起 app，进入菜库 → 打开一道菜详情 → 点编辑 → 改菜名/食材（含单位）/步骤、增删行 → 保存 → 详情即时更新；**刷新页面后仍在**（后端持久化）；改名后菜库**无重复条目**。

- [ ] **Step 4: 行数红线检查** — 确认 `CookingQueue.jsx` 仍 < 800 行；若逼近，把详情弹窗只读展示或编辑接线抽成小组件/子文件。

- [ ] **Step 5: Commit**
```
git add src/components/CookingQueue.jsx
git commit -m "feat: edit saved dishes via DishEditor in CookingQueue detail modal"
```

---

## Task 6: 菜库按菜名搜索

**Files:** Modify `src/components/CookingQueue.jsx`

- [ ] **Step 1: 加搜索状态与过滤** — 在 `src/components/CookingQueue.jsx`：
1. 加状态：`const [searchTerm, setSearchTerm] = useState('');`
2. 加归一化 + 过滤工具（放组件外或组件内顶部）：
```js
const normalizeForSearch = (s) => (s || '').replace(/\s+/g, '').toLowerCase();
```
3. 找到当前用于渲染列表的数组（现有按分类过滤后的 dishes，实现者读代码确认其变量名，例如 `filteredDishes` 或直接 `savedDishes.filter(...)`）。在该分类过滤之后，再叠加菜名搜索过滤：
```js
    const term = normalizeForSearch(searchTerm);
    const visibleDishes = (/* 现有分类过滤结果 */).filter(d =>
        term === '' || normalizeForSearch(d.dish_name || d.name).includes(term)
    );
```
把列表渲染改为遍历 `visibleDishes`。

- [ ] **Step 2: 加搜索框 UI** — 在列表区上方（分类筛选附近）加输入框，用现有输入样式类（与项目其他输入一致；若无专用类则用与分类筛选区一致的内联样式）：
```jsx
            <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="搜索菜名…"
                className="search-input"
                style={{ padding: '0.5rem 0.8rem', border: '2px solid var(--color-ink)', borderRadius: '6px', width: '100%', maxWidth: '320px', marginBottom: '1rem' }}
            />
```

- [ ] **Step 3: 验证** — Run: `npm run build` → 成功。Run: `npx vitest run` → 全绿。

- [ ] **Step 4: 手动验证** — 菜库输入"牛肉"→ 仅显示菜名含"牛肉"的菜；清空 → 全部显示；与某个分类筛选叠加时两者同时生效；大小写/空格不影响匹配。

- [ ] **Step 5: 行数红线检查** — 确认 `CookingQueue.jsx` < 800 行。

- [ ] **Step 6: Commit**
```
git add src/components/CookingQueue.jsx
git commit -m "feat: add recipe-name search filter in CookingQueue"
```

---

## Task 7: 文档同步与最终验证

**Files:** Modify `src/utils/CLAUDE.md`, `src/components/CLAUDE.md`, `src/hooks/CLAUDE.md`

- [ ] **Step 1: 更新 L2 模块文档** —
  - `src/utils/CLAUDE.md`：加 `dishDraft.js`（emptyIngredient/normalizeDishDraft，保留食材单位）。
  - `src/components/CLAUDE.md`：加 `DishEditor.jsx`（共享菜谱编辑表单）；更新 `CookingQueue.jsx`（详情弹窗可编辑 + 菜名搜索）、`ResultsView.jsx`（改用 DishEditor）。
  - `src/hooks/CLAUDE.md`：更新 `useRecipeStore.js`（加 `updateDish`）。

- [ ] **Step 2: 校验 L3 文件头** — 确认 `dishDraft.js`、`DishEditor.jsx` 头部 `[IN]/[OUT]/[POS]/[PROTOCOL]` 与实际一致。

- [ ] **Step 3: 全量验证** — Run: `npm test`（dishDraft 新增用例 + 既有全部通过）。Run: `npm run build`（成功）。

- [ ] **Step 4: 红线终检** — 列出本次新增/修改文件行数：`dishDraft.js`、`DishEditor.jsx`、`useRecipeStore.js`、`ResultsView.jsx`、`CookingQueue.jsx`、`App.jsx`。任一文件 >800 或函数 >30 行/嵌套>3/分支>3 → 重构（如把 CookingQueue 详情弹窗或编辑接线抽成子组件）。

- [ ] **Step 5: 外观一致性核对** — 对照现有弹窗/按钮/输入，确认 DishEditor 与搜索框无突兀新样式（复用 glass-card/modal-*/btn-*/现有输入样式）。

- [ ] **Step 6: Commit**
```
git add -A
git commit -m "docs: sync module docs for dish editing + search"
```

---

## 自查记录（spec 覆盖）

- 编辑已保存菜（名/食材含单位/步骤/分类）：Task 2(store) + Task 3(DishEditor) + Task 5(菜库接线) ✓
- 保留单位（修旧 bug）：Task 1(normalizeDishDraft 保 unit) + Task 3(IngredientRow 有 unit 输入) + Task 4(ResultsView 换用) ✓
- 增/删/改（无排序）：Task 3（添加/删除行 + 编辑字段）✓
- 共享编辑器（ResultsView + 菜库）：Task 3 + Task 4 + Task 5 ✓
- 按 _id 更新避免改名重复：Task 2 ✓
- 按菜名搜索（子串、与分类叠加）：Task 6 ✓
- 保持现有外观（复用现有样式类/弹窗外壳）：Task 3/5/6 + Task 7 Step 5 ✓
- 测试（纯函数单测 + 手动 UI 验证）：Task 1 + Task 4/5/6 手动 ✓
- 文档同步：Task 7 ✓
```
