# 本地后端持久化 + 导出/导入备份 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把菜库从"仅浏览器 localStorage"升级为"本地后端 JSON 文件为权威源 + localStorage 镜像缓存"，并提供整库导出/导入（合并 + 冲突解决）备份能力。

**Architecture:** 后端新增 `dishesStore` 模块（原子读写 `server/data/users/<userId>.json`，userId 暂固定 `default` 作多用户接缝）+ `GET/PUT /api/dishes` 两个接口。前端新增 `dishesApi`（HTTP 封装）与 `recipeBackup`（导出/解析/相似度/合并纯函数），改造 `useRecipeStore` 在挂载时拉取/迁移、变更时防抖推送，并在菜库视图加导出/导入入口与冲突解决弹窗。

**Tech Stack:** Node + Express 5（ESM）、React 19、Vite 6、Vitest（本计划新增测试框架）。

设计依据：`.claude/plans/recipe-backup-persistence.md`。

---

## 文件结构

**新增：**
- `server/dishesStore.js` — 后端存储层：`getUserId`、`readLibrary`、`writeLibrary`（原子写）。
- `server/dishesStore.test.js` — 存储层单测。
- `src/api/dishesApi.js` — 前端 HTTP 封装：`fetchLibrary`、`pushLibrary`（带超时）。
- `src/utils/recipeBackup.js` — 纯函数：`buildBackup`、`parseBackup`、`nameSimilarity`、`mergeLibrary`。
- `src/utils/recipeBackup.test.js` — 备份纯函数单测。
- `src/components/ImportConflictModal.jsx` — 导入冲突解决弹窗。

**修改：**
- `server/index.js` — 注册 `GET/PUT /api/dishes`（必须在 SPA 兜底路由 `app.get(/.*/...)` 之前）。
- `src/hooks/useRecipeStore.js` — 挂载同步、迁移、防抖推送；新增 `importLibrary`、`replaceAll`、`exportData`、`syncState`。
- `src/components/CookingQueue.jsx` — 加导出/导入按钮与冲突弹窗接线。
- `src/App.jsx` — 把新 store 能力透传给 `CookingQueue`。
- `vite.config.js` — 加 `test` 配置。
- `package.json` — 加 `test` 脚本与 vitest 依赖。
- `.gitignore` — 加 `server/data/`。

---

## Task 0: 测试框架与忽略项

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `.gitignore`

- [ ] **Step 1: 安装 vitest**

Run:
```
npm install -D vitest@^2
```
Expected: 安装成功，`package.json` devDependencies 出现 `vitest`。

- [ ] **Step 2: 加 test 脚本**

修改 `package.json` 的 `scripts`，在 `"preview": "vite preview"` 后加一行：
```json
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: 给 vite.config.js 加 test 配置**

把 `vite.config.js` 改为：
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.{js,jsx}', 'server/**/*.test.js'],
    },
});
```

- [ ] **Step 4: 忽略数据目录**

确保 `.gitignore` 含一行（若无则追加）：
```
server/data/
```

- [ ] **Step 5: 验证 vitest 可运行（无测试时也应正常退出）**

Run:
```
npm test
```
Expected: vitest 启动，报告 "No test files found" 或 0 个测试通过，进程退出码 0（无报错）。

- [ ] **Step 6: Commit**

```
git add package.json package-lock.json vite.config.js .gitignore
git commit -m "chore: add vitest and ignore server data dir"
```

---

## Task 1: 后端存储层 dishesStore

**Files:**
- Create: `server/dishesStore.js`
- Test: `server/dishesStore.test.js`

- [ ] **Step 1: 写失败测试**

Create `server/dishesStore.test.js`:
```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getUserId, readLibrary, writeLibrary } from './dishesStore.js';

let baseDir;

beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dishes-test-'));
});
afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
});

describe('getUserId', () => {
    it('returns "default" as the multi-user seam', () => {
        expect(getUserId({})).toBe('default');
    });
});

describe('readLibrary', () => {
    it('returns empty library with default categories when file missing', () => {
        const lib = readLibrary('default', baseDir);
        expect(lib.dishes).toEqual([]);
        expect(lib.categories).toContain('荤菜');
        expect(lib.updatedAt).toBeNull();
    });

    it('reads back what writeLibrary wrote', () => {
        writeLibrary('default', { dishes: [{ dish_name: '番茄炒蛋' }], categories: ['素菜'] }, '2026-06-06T00:00:00.000Z', baseDir);
        const lib = readLibrary('default', baseDir);
        expect(lib.dishes).toHaveLength(1);
        expect(lib.dishes[0].dish_name).toBe('番茄炒蛋');
        expect(lib.categories).toEqual(['素菜']);
        expect(lib.updatedAt).toBe('2026-06-06T00:00:00.000Z');
    });
});

describe('writeLibrary', () => {
    it('throws when dishes is not an array', () => {
        expect(() => writeLibrary('default', { dishes: 'nope' }, null, baseDir)).toThrow();
    });

    it('writes atomically leaving no .tmp file behind', () => {
        writeLibrary('default', { dishes: [], categories: [] }, null, baseDir);
        const leftovers = fs.readdirSync(baseDir).filter(f => f.endsWith('.tmp'));
        expect(leftovers).toEqual([]);
    });

    it('produces a file that is always valid JSON after repeated writes', () => {
        for (let i = 0; i < 5; i++) {
            writeLibrary('default', { dishes: [{ dish_name: 'd' + i }], categories: [] }, null, baseDir);
        }
        const lib = readLibrary('default', baseDir);
        expect(lib.dishes[0].dish_name).toBe('d4');
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run server/dishesStore.test.js`
Expected: FAIL，报 `dishesStore.js` 找不到或导出未定义。

- [ ] **Step 3: 实现 dishesStore.js**

Create `server/dishesStore.js`:
```js
/**
 * [IN]: fs, path（Node 内置）
 * [OUT]: getUserId/readLibrary/writeLibrary — 菜库本地 JSON 持久化
 * [POS]: 被 server/index.js 的 /api/dishes 路由消费
 * [PROTOCOL]: 变更接口时同步更新本头部、server/CLAUDE.md、.claude/plans 设计文档
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = path.join(__dirname, 'data', 'users');
const DEFAULT_CATEGORIES = ['荤菜', '素菜', '汤煲', '主食', '烘焙', '小吃'];

/** 多用户接缝：当前固定 default，未来从认证会话取真实用户 */
export function getUserId(_req) {
    return 'default';
}

function userFile(userId, baseDir) {
    return path.join(baseDir, `${userId}.json`);
}

export function readLibrary(userId, baseDir = DEFAULT_BASE) {
    const file = userFile(userId, baseDir);
    if (!fs.existsSync(file)) {
        return { dishes: [], categories: DEFAULT_CATEGORIES, updatedAt: null };
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeLibrary(userId, { dishes, categories }, updatedAt, baseDir = DEFAULT_BASE) {
    if (!Array.isArray(dishes)) {
        throw new Error('dishes must be an array');
    }
    fs.mkdirSync(baseDir, { recursive: true });
    const file = userFile(userId, baseDir);
    const tmp = `${file}.tmp`;
    const payload = {
        dishes,
        categories: Array.isArray(categories) ? categories : DEFAULT_CATEGORIES,
        updatedAt: updatedAt ?? null,
    };
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return payload;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run server/dishesStore.test.js`
Expected: PASS，全部用例通过。

- [ ] **Step 5: Commit**

```
git add server/dishesStore.js server/dishesStore.test.js
git commit -m "feat(server): add dishesStore atomic JSON persistence layer"
```

---

## Task 2: 后端 GET/PUT /api/dishes

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 导入存储层**

在 `server/index.js` 顶部 import 区（`import { GoogleGenerativeAI } ...` 之后）加：
```js
import { getUserId, readLibrary, writeLibrary } from './dishesStore.js';
```

- [ ] **Step 2: 注册路由（必须在 SPA 兜底之前）**

在 `server/index.js` 的 health check 路由之后、`app.use(express.static(...))`（静态托管）**之前**，插入：
```js
// ============================================
// 菜库持久化 — GET/PUT /api/dishes
// ============================================
app.get('/api/dishes', (req, res) => {
    try {
        res.json(readLibrary(getUserId(req)));
    } catch (err) {
        console.error('[Dishes] read error:', err.message);
        res.status(500).json({ error: cleanError(err) });
    }
});

app.put('/api/dishes', (req, res) => {
    try {
        const { dishes, categories } = req.body || {};
        if (!Array.isArray(dishes)) {
            return res.status(400).json({ error: 'dishes 必须是数组' });
        }
        const saved = writeLibrary(getUserId(req), { dishes, categories }, new Date().toISOString());
        res.json({ ok: true, updatedAt: saved.updatedAt });
    } catch (err) {
        console.error('[Dishes] write error:', err.message);
        res.status(500).json({ error: cleanError(err) });
    }
});
```
注意：`cleanError` 与 `app.use(express.json(...))` 已在文件中存在；务必把这两个路由放在 `app.get(/.*/, ...)` SPA 兜底路由之前，否则会被兜底拦截。

- [ ] **Step 2.5: 确认 body 解析上限足够**

确认文件顶部已有 `app.use(express.json({ limit: '10mb' }));`（已存在）。整库 PUT 在该上限内。

- [ ] **Step 3: 手动验证 GET（空库）**

启动后端（独立终端，按既有方式 `node server/index.js`），另一终端运行：
```
curl.exe -s http://localhost:4000/api/dishes
```
Expected: 返回 `{"dishes":[],"categories":["荤菜",...],"updatedAt":null}`。

- [ ] **Step 4: 手动验证 PUT 后再 GET**

```
curl.exe -s -X PUT -H "Content-Type: application/json" -d "{\"dishes\":[{\"dish_name\":\"测试菜\"}],\"categories\":[\"荤菜\"]}" http://localhost:4000/api/dishes
curl.exe -s http://localhost:4000/api/dishes
```
Expected: PUT 返回 `{"ok":true,"updatedAt":"..."}`；GET 返回含 `测试菜` 的库。确认生成了 `server/data/users/default.json`。验证后删除该文件以免污染：`Remove-Item server/data/users/default.json`。

- [ ] **Step 5: Commit**

```
git add server/index.js
git commit -m "feat(server): add GET/PUT /api/dishes endpoints"
```

---

## Task 3: 备份纯函数 recipeBackup

**Files:**
- Create: `src/utils/recipeBackup.js`
- Test: `src/utils/recipeBackup.test.js`

- [ ] **Step 1: 写失败测试**

Create `src/utils/recipeBackup.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, nameSimilarity, mergeLibrary } from './recipeBackup.js';

describe('buildBackup / parseBackup roundtrip', () => {
    it('builds a versioned backup and parses it back', () => {
        const backup = buildBackup([{ dish_name: '番茄炒蛋' }], ['素菜']);
        expect(backup.version).toBe(1);
        expect(backup.dishes).toHaveLength(1);
        const parsed = parseBackup(JSON.stringify(backup));
        expect(parsed.dishes[0].dish_name).toBe('番茄炒蛋');
        expect(parsed.categories).toEqual(['素菜']);
    });
});

describe('parseBackup validation', () => {
    it('throws on non-JSON', () => {
        expect(() => parseBackup('not json')).toThrow();
    });
    it('throws on wrong version', () => {
        expect(() => parseBackup(JSON.stringify({ version: 99, dishes: [] }))).toThrow();
    });
    it('throws when dishes missing', () => {
        expect(() => parseBackup(JSON.stringify({ version: 1 }))).toThrow();
    });
});

describe('nameSimilarity', () => {
    it('returns 1 for identical names ignoring spaces', () => {
        expect(nameSimilarity('泡椒 牛肉', '泡椒牛肉')).toBe(1);
    });
    it('returns high score for similar names', () => {
        expect(nameSimilarity('泡椒牛肉', '泡椒牛柳')).toBeGreaterThan(0.5);
    });
    it('returns low score for unrelated names', () => {
        expect(nameSimilarity('番茄炒蛋', '红烧排骨')).toBeLessThan(0.3);
    });
    it('handles single-char names by exact compare', () => {
        expect(nameSimilarity('蛋', '蛋')).toBe(1);
        expect(nameSimilarity('蛋', '肉')).toBe(0);
    });
});

describe('mergeLibrary', () => {
    it('adds brand-new dishes', () => {
        const { merged, conflicts } = mergeLibrary([{ dish_name: 'A' }], [{ dish_name: 'B' }]);
        expect(merged).toHaveLength(2);
        expect(conflicts).toHaveLength(0);
    });
    it('flags exact-name duplicates as conflicts', () => {
        const { merged, conflicts } = mergeLibrary([{ dish_name: '番茄炒蛋' }], [{ dish_name: '番茄炒蛋' }]);
        expect(merged).toHaveLength(1);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].incoming.dish_name).toBe('番茄炒蛋');
    });
    it('flags high-similarity dishes as conflicts', () => {
        const { conflicts } = mergeLibrary([{ dish_name: '泡椒牛肉' }], [{ dish_name: '泡椒 牛肉' }], 0.8);
        expect(conflicts).toHaveLength(1);
    });
    it('supports name field as fallback to dish_name', () => {
        const { conflicts } = mergeLibrary([{ name: '番茄炒蛋' }], [{ dish_name: '番茄炒蛋' }]);
        expect(conflicts).toHaveLength(1);
    });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/utils/recipeBackup.test.js`
Expected: FAIL，`recipeBackup.js` 未找到。

- [ ] **Step 3: 实现 recipeBackup.js**

Create `src/utils/recipeBackup.js`:
```js
/**
 * [IN]: 无外部依赖（纯函数）
 * [OUT]: buildBackup/parseBackup/nameSimilarity/mergeLibrary — 备份打包/解析与菜库合并
 * [POS]: 被 useRecipeStore 与 ImportConflictModal 消费
 * [PROTOCOL]: 变更格式/版本时同步更新本头部、src/utils 模块文档、设计文档
 */
const BACKUP_VERSION = 1;

export function buildBackup(dishes, categories) {
    return {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        dishes,
        categories,
    };
}

export function parseBackup(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error('文件不是合法 JSON');
    }
    if (!data || typeof data !== 'object') throw new Error('备份格式无效');
    if (data.version !== BACKUP_VERSION) throw new Error(`不支持的备份版本：${data.version}`);
    if (!Array.isArray(data.dishes)) throw new Error('备份缺少 dishes 数组');
    return {
        dishes: data.dishes,
        categories: Array.isArray(data.categories) ? data.categories : [],
    };
}

function normalizeName(name) {
    return (name || '').replace(/\s+/g, '').toLowerCase();
}

function dishName(d) {
    return d.dish_name || d.name || '';
}

function bigrams(str) {
    const set = new Set();
    for (let i = 0; i < str.length - 1; i++) set.add(str.slice(i, i + 2));
    return set;
}

export function nameSimilarity(a, b) {
    const na = normalizeName(a);
    const nb = normalizeName(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;
    const ba = bigrams(na);
    const bb = bigrams(nb);
    let overlap = 0;
    for (const g of ba) if (bb.has(g)) overlap++;
    return (2 * overlap) / (ba.size + bb.size);
}

export function mergeLibrary(current, incoming, threshold = 0.8) {
    const merged = [...current];
    const conflicts = [];
    for (const inc of incoming) {
        const incName = dishName(inc);
        const match = merged.find(
            (cur) => dishName(cur) === incName || nameSimilarity(incName, dishName(cur)) >= threshold
        );
        if (match) {
            conflicts.push({ current: match, incoming: inc });
        } else {
            merged.push(inc);
        }
    }
    return { merged, conflicts };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/utils/recipeBackup.test.js`
Expected: PASS，全部用例通过。

- [ ] **Step 5: Commit**

```
git add src/utils/recipeBackup.js src/utils/recipeBackup.test.js
git commit -m "feat: add recipeBackup pure functions (export/parse/similarity/merge)"
```

---

## Task 4: 前端 HTTP 封装 dishesApi

**Files:**
- Create: `src/api/dishesApi.js`

- [ ] **Step 1: 实现 dishesApi.js**

Create `src/api/dishesApi.js`:
```js
/**
 * [IN]: fetch（浏览器）
 * [OUT]: fetchLibrary/pushLibrary — 与后端 /api/dishes 读写（带超时）
 * [POS]: 被 useRecipeStore 消费
 * [PROTOCOL]: 变更接口形态时同步更新本头部、server/index.js 路由、设计文档
 */
const API_BASE = '/api';

async function withTimeout(run, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        return await run(ctrl.signal);
    } finally {
        clearTimeout(timer);
    }
}

export function fetchLibrary(timeoutMs = 4000) {
    return withTimeout(async (signal) => {
        const res = await fetch(`${API_BASE}/dishes`, { signal });
        if (!res.ok) throw new Error(`GET /api/dishes ${res.status}`);
        return res.json();
    }, timeoutMs);
}

export function pushLibrary({ dishes, categories }, timeoutMs = 4000) {
    return withTimeout(async (signal) => {
        const res = await fetch(`${API_BASE}/dishes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dishes, categories }),
            signal,
        });
        if (!res.ok) throw new Error(`PUT /api/dishes ${res.status}`);
        return res.json();
    }, timeoutMs);
}
```

- [ ] **Step 2: 冒烟验证可被导入（语法/解析）**

Run: `npx vitest run` （现有测试仍应全绿，确认新文件不破坏构建解析）
Expected: PASS，无报错。

- [ ] **Step 3: Commit**

```
git add src/api/dishesApi.js
git commit -m "feat: add dishesApi client for backend library sync"
```

---

## Task 5: useRecipeStore 接入后端同步

**Files:**
- Modify: `src/hooks/useRecipeStore.js`

说明：保持现有对外方法（`saveDish/saveDishes/removeDish/clearAll/toggleQueue/...`）签名不变。新增：挂载同步 + 迁移、防抖推送、`importLibrary(dishes, categories)`、`replaceAll(dishes, categories)`、`exportData()`、`syncState`。`queue` 不落盘（保持 localStorage）。

- [ ] **Step 1: 加入后端同步依赖与防抖推送**

在 `src/hooks/useRecipeStore.js` 顶部加导入：
```js
import { fetchLibrary, pushLibrary } from '../api/dishesApi.js';
```

- [ ] **Step 2: 在 useRecipeStore 内加同步状态与 refs**

在 `const [categories, setCategories] = useState(...)` 之后插入：
```js
    // 后端同步状态：'syncing' | 'synced' | 'local-only'
    const [syncState, setSyncState] = useState('syncing');
    const hydratedRef = useRef(false);   // 是否已完成首次后端拉取
    const pushTimerRef = useRef(null);    // 防抖计时器
```
并确保从 `react` 顶部已导入 `useRef`（当前文件已导入 `useState, useEffect, useCallback`，需补 `useRef`）：
```js
import { useState, useEffect, useCallback, useRef } from 'react';
```

- [ ] **Step 3: 挂载时拉取 / 迁移（替换原有"纯 localStorage 初始化"语义）**

在现有的"Persist on change"effect 之前，加入挂载同步 effect：
```js
    // 挂载：从后端拉取；后端空但本地有数据则迁移；连不上则降级本地
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const lib = await fetchLibrary();
                if (cancelled) return;
                const hasRemote = Array.isArray(lib.dishes) && lib.dishes.length > 0;
                const localDishes = savedDishes;
                if (hasRemote) {
                    setSavedDishes(lib.dishes);
                    if (Array.isArray(lib.categories) && lib.categories.length) {
                        setCategories(lib.categories);
                    }
                    setSyncState('synced');
                } else if (localDishes.length > 0) {
                    // 迁移：把本地数据 seed 到后端
                    await pushLibrary({ dishes: localDishes, categories });
                    setSyncState('synced');
                } else {
                    setSyncState('synced');
                }
            } catch {
                if (!cancelled) setSyncState('local-only');
            } finally {
                if (!cancelled) hydratedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
```

- [ ] **Step 4: 变更时防抖推送后端**

在现有三条 `saveJSON` persist effect 之后，加入防抖推送 effect：
```js
    // 菜/分类变更后防抖推送整库到后端（挂载拉取完成后才推，避免覆盖远端）
    useEffect(() => {
        if (!hydratedRef.current) return;
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = setTimeout(() => {
            setSyncState('syncing');
            pushLibrary({ dishes: savedDishes, categories })
                .then(() => setSyncState('synced'))
                .catch(() => setSyncState('local-only'));
        }, 800);
        return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
    }, [savedDishes, categories]);
```

- [ ] **Step 5: 加入 import/replace/export 方法**

在 `updateDishCategory` 之后、`return {` 之前插入：
```js
    /** 整库替换（用于"整库替换"式导入或还原） */
    const replaceAll = useCallback((dishes, cats) => {
        setSavedDishes(dishes.map(d => ({
            ...d,
            _id: d._id || generateId(),
            _savedAt: d._savedAt || Date.now(),
        })));
        if (Array.isArray(cats) && cats.length) setCategories(cats);
    }, []);

    /** 应用合并后的菜库（冲突已由调用方解决） */
    const importLibrary = useCallback((mergedDishes, cats) => {
        setSavedDishes(mergedDishes.map(d => ({
            ...d,
            _id: d._id || generateId(),
            _savedAt: d._savedAt || Date.now(),
        })));
        if (Array.isArray(cats) && cats.length) {
            setCategories(prev => Array.from(new Set([...prev, ...cats])));
        }
    }, []);

    /** 导出当前整库快照（供 recipeBackup.buildBackup 使用） */
    const exportData = useCallback(() => ({
        dishes: savedDishes,
        categories,
    }), [savedDishes, categories]);
```

- [ ] **Step 6: 在 return 暴露新成员**

把 `return { ... }` 内追加：
```js
        syncState,
        replaceAll,
        importLibrary,
        exportData,
```

- [ ] **Step 7: 手动验证迁移与持久化**

1) 删除 `server/data/users/default.json`（若存在）。2) 起后端（4000）+ `npm run dev`。3) 在 app 里保存一道菜。4) 等 ~1s，确认 `server/data/users/default.json` 出现且含该菜。5) 刷新页面，菜仍在。6) 清空浏览器 localStorage 后刷新，菜应从后端恢复显示。
Expected: 上述均成立。

- [ ] **Step 8: 回归测试**

Run: `npx vitest run`
Expected: PASS（已有单测不受影响）。

- [ ] **Step 9: Commit**

```
git add src/hooks/useRecipeStore.js
git commit -m "feat: sync recipe store with backend (load/migrate/debounced push)"
```

---

## Task 6: 导出按钮

**Files:**
- Modify: `src/components/CookingQueue.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: 给 App 传入导出能力**

`src/App.jsx` 中 `CookingQueue` 的 props 里追加（在 `updateDishCategory={store.updateDishCategory}` 之后）：
```js
                                exportData={store.exportData}
                                importLibrary={store.importLibrary}
                                replaceAll={store.replaceAll}
                                categories={store.categories}
```
（`categories` 若已传则不重复。）

- [ ] **Step 2: 在 CookingQueue 顶部加导出按钮与处理函数**

先在 `src/components/CookingQueue.jsx` 顶部 import 区加：
```js
import { buildBackup, parseBackup, mergeLibrary } from '../utils/recipeBackup.js';
```
在组件内（拿到 props 后）加导出处理：
```js
    const handleExportBackup = () => {
        const { dishes, categories: cats } = exportData();
        const backup = buildBackup(dishes, cats);
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date();
        const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        a.download = `kitchen-backup_${stamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('已导出菜库备份', 'success');
    };
```
在菜库操作区（与"全选/清空"等按钮同一行/区域）加按钮：
```jsx
            <button className="btn-secondary" onClick={handleExportBackup}>导出备份</button>
```
（确保从 props 解构出 `exportData`、`addToast`。）

- [ ] **Step 3: 手动验证导出**

起 app，进入菜库视图，点"导出备份"。
Expected: 下载 `kitchen-backup_<日期>.json`，内容含 `version:1`、`dishes`、`categories`。

- [ ] **Step 4: Commit**

```
git add src/App.jsx src/components/CookingQueue.jsx
git commit -m "feat: add full-library backup export button"
```

---

## Task 7: 导入 + 冲突解决弹窗

**Files:**
- Create: `src/components/ImportConflictModal.jsx`
- Modify: `src/components/CookingQueue.jsx`

- [ ] **Step 1: 实现冲突解决弹窗**

Create `src/components/ImportConflictModal.jsx`:
```jsx
/**
 * [IN]: react, framer-motion；props: conflicts, onResolve, onCancel
 * [OUT]: ImportConflictModal — 逐个解决导入重名/相似冲突
 * [POS]: 被 CookingQueue 在导入时挂载
 * [PROTOCOL]: 变更冲突数据结构时同步 recipeBackup.mergeLibrary 与设计文档
 */
import React, { useState } from 'react';

const CHOICES = {
    KEEP_CURRENT: 'keep_current',
    USE_INCOMING: 'use_incoming',
    KEEP_BOTH: 'keep_both',
};

export default function ImportConflictModal({ conflicts, onResolve, onCancel }) {
    const [choices, setChoices] = useState(() => conflicts.map(() => CHOICES.KEEP_CURRENT));

    const setChoice = (idx, val) => {
        setChoices(prev => prev.map((c, i) => (i === idx ? val : c)));
    };

    const name = (d) => d.dish_name || d.name || '未命名';

    const submit = () => {
        onResolve(conflicts.map((c, i) => ({ conflict: c, choice: choices[i] })));
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-card" style={{ maxWidth: 560, width: '90%', maxHeight: '80vh', overflow: 'auto', padding: '1.5rem' }}>
                <h3>导入冲突（{conflicts.length}）</h3>
                <p style={{ fontSize: '0.95rem', opacity: 0.8 }}>以下菜名重复或高度相似，请逐个选择保留方式：</p>
                {conflicts.map((c, i) => (
                    <div key={i} style={{ borderTop: '1px solid var(--color-border, #ddd)', padding: '0.8rem 0' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            现有：{name(c.current)} ↔ 导入：{name(c.incoming)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <label><input type="radio" name={`c${i}`} checked={choices[i] === CHOICES.KEEP_CURRENT} onChange={() => setChoice(i, CHOICES.KEEP_CURRENT)} /> 保留现有</label>
                            <label><input type="radio" name={`c${i}`} checked={choices[i] === CHOICES.USE_INCOMING} onChange={() => setChoice(i, CHOICES.USE_INCOMING)} /> 用导入的</label>
                            <label><input type="radio" name={`c${i}`} checked={choices[i] === CHOICES.KEEP_BOTH} onChange={() => setChoice(i, CHOICES.KEEP_BOTH)} /> 两个都留</label>
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={onCancel}>取消</button>
                    <button className="btn-primary" onClick={submit}>应用</button>
                </div>
            </div>
        </div>
    );
}

export { CHOICES };
```

- [ ] **Step 2: 在 CookingQueue 接线导入流程**

在 `src/components/CookingQueue.jsx`：
1) import：
```js
import ImportConflictModal, { CHOICES } from './ImportConflictModal.jsx';
```
2) 状态与 ref：
```js
    const [conflictState, setConflictState] = useState(null); // { merged, conflicts, cats }
    const fileInputRef = useRef(null);
```
（确保 `useState, useRef` 已从 react 导入。）
3) 选择文件触发与解析：
```jsx
    <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }}
        onChange={(e) => handleImportFile(e.target.files?.[0])} />
    <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>导入备份</button>
```
4) 处理函数：
```js
    const dishName = (d) => d.dish_name || d.name || '';

    const handleImportFile = async (file) => {
        if (!file) return;
        let parsed;
        try {
            parsed = parseBackup(await file.text());
        } catch (err) {
            addToast('导入失败：' + err.message, 'error');
            return;
        }
        const { merged, conflicts } = mergeLibrary(savedDishes, parsed.dishes);
        if (conflicts.length === 0) {
            importLibrary(merged, parsed.categories);
            addToast(`已导入，新增 ${merged.length - savedDishes.length} 道菜`, 'success');
        } else {
            setConflictState({ base: merged, conflicts, cats: parsed.categories });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const applyResolutions = (resolutions) => {
        // base = 已含现有 + 无冲突的新菜；现在按选择处理冲突项
        let result = [...conflictState.base];
        for (const { conflict, choice } of resolutions) {
            if (choice === CHOICES.KEEP_CURRENT) {
                continue; // 现有已在 base 中
            }
            if (choice === CHOICES.USE_INCOMING) {
                result = result.map(d =>
                    dishName(d) === dishName(conflict.current) ? conflict.incoming : d
                );
            } else if (choice === CHOICES.KEEP_BOTH) {
                result.push({ ...conflict.incoming, dish_name: dishName(conflict.incoming) + '（导入）' });
            }
        }
        importLibrary(result, conflictState.cats);
        addToast('导入完成', 'success');
        setConflictState(null);
    };
```
5) 渲染弹窗（组件 return 内末尾）：
```jsx
    {conflictState && (
        <ImportConflictModal
            conflicts={conflictState.conflicts}
            onResolve={applyResolutions}
            onCancel={() => setConflictState(null)}
        />
    )}
```
6) 确保从 props 解构出 `importLibrary`（Task 6 已透传）。

- [ ] **Step 3: 手动验证导入三场景**

A) 导入与现有完全不重叠的备份 → 直接合并，Toast 显示新增数。
B) 导入含与现有重名的备份 → 弹窗出现，选"用导入的"后该菜被替换；选"两个都留"出现带"（导入）"后缀的副本。
C) 导入非法/旧版本 JSON → Toast 报错，现有库不变。
Expected: 三场景均符合。

- [ ] **Step 4: 回归测试**

Run: `npx vitest run`
Expected: PASS。

- [ ] **Step 5: Commit**

```
git add src/components/ImportConflictModal.jsx src/components/CookingQueue.jsx
git commit -m "feat: add backup import with merge and conflict resolution"
```

---

## Task 8: 文档同步与最终验证

**Files:**
- Modify: `server/CLAUDE.md`（若不存在则创建 L2 模块文档）
- Modify: `src/CLAUDE.md` 或相关模块 `CLAUDE.md`（L2）
- Modify: 根 `CLAUDE.md`（若需在架构总览补一行）

- [ ] **Step 1: 更新/创建模块 L2 文档**

在 `server/CLAUDE.md` 记录 `dishesStore.js` 职责与 `/api/dishes` 接口；在 `src/` 相应模块文档记录 `api/dishesApi.js`、`utils/recipeBackup.js`、`components/ImportConflictModal.jsx`、`hooks/useRecipeStore.js` 的新职责。遵循分形文档规范（L1/L2/L3 同构）。

- [ ] **Step 2: 校验文件头契约**

逐一确认本次新增/修改文件的 `[IN]/[OUT]/[POS]/[PROTOCOL]` 头与实际代码一致。

- [ ] **Step 3: 全量测试**

Run: `npm test`
Expected: 全绿。

- [ ] **Step 4: 端到端冒烟**

起后端 + dev：保存菜→落盘→刷新仍在→清 localStorage 后从后端恢复→导出备份→清空菜库→导入备份恢复（含冲突解决）。
Expected: 全流程通过。

- [ ] **Step 5: 行数红线检查**

确认 `useRecipeStore.js`、`CookingQueue.jsx` 未超 800 行、新增函数未超 30 行/嵌套≤3。若 `CookingQueue.jsx` 因导入逻辑膨胀，按需把导入处理抽到 `src/hooks/useBackupIO.js`。

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "docs: sync module docs and file-header contracts for backup feature"
```

---

## 自查记录（spec 覆盖）

- 后端 JSON 持久化 + 原子写：Task 1/2 ✓
- 多用户接缝 `users/<userId>.json` + `getUserId`：Task 1 ✓
- localStorage 镜像 + 挂载拉取 + 迁移 + 防抖推送 + 降级：Task 5 ✓
- 持久化菜+分类、队列不落盘：Task 5（仅 push dishes/categories）✓
- 导出整库（版本化）：Task 6 ✓
- 导入合并 + 重名/相似度冲突 UI：Task 3 + Task 7 ✓
- 相似度阈值 0.8 / 防抖 800ms / 路径 users/default.json：Task 3/5/1 ✓
- 失败处理（后端不可达降级、非法文件报错不破坏）：Task 5/7 ✓
- 测试（后端、纯函数、迁移、集成）：Task 1/3 单测 + Task 5/7/8 手动集成 ✓
- 文档同步：Task 8 ✓
