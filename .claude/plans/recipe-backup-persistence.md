# 设计文档：本地后端持久化 + 导出/导入备份

- 日期：2026-06-06
- 状态：设计已确认，待写实现计划
- 功能简述：把菜库从"仅 localStorage"升级为"本地后端 JSON 文件为权威存储 + localStorage 镜像缓存"，并提供整库导出/导入备份能力。

---

## 1. 背景与目标

### 现状
- 菜库（`savedDishes`）、分类（`categories`）、采购队列（`queue`）全部存在浏览器 **localStorage**（`src/hooks/useRecipeStore.js`，key：`recipe_saved_dishes` / `recipe_cooking_queue` / `recipe_categories`）。
- 后端 `server/index.js` **不持久化任何菜谱**，只做 multer 临时上传文件（用完即删）。
- 已有的导出（`App.jsx` `handleExportJSON/Markdown`）只导出**当前这次识别结果**，不是整库，且**无导入**——算不上真正的备份/还原。

### 问题
- localStorage 绑定"浏览器 + 站点源"。清缓存、换浏览器/设备、dev 端口或域名变化、生产域名与本地 localhost 之间，数据都各自独立或直接丢失且无法找回。

### 目标
1. 数据落盘到本地后端文件，换浏览器/清缓存不丢。
2. 整库导出成文件、可再导入恢复（迁移/异地备份）。
3. 为"未来部署多用户"留低成本接缝，本次不实现多用户。

### 非目标（YAGNI）
- 本次**不做**用户认证、登录、多用户隔离的完整实现。
- 不做云同步、不做跨设备实时同步。

---

## 2. 关键决策（已与用户确认）

| 决策 | 选择 |
|---|---|
| 后端存储介质 | 本地 **JSON 文件**（零原生依赖；Windows + Node 23 友好；与导出格式一致） |
| 数据源权威性 | **后端文件为唯一权威源**；localStorage 退化为镜像缓存 |
| 后端没开时 | app 仍可**查看**缓存数据；加新菜本就依赖后端（OCR/解析走后端调 Gemini），不额外降低可用性 |
| 持久化范围 | **菜 + 分类**落盘；**采购队列**为临时勾选，仅留 localStorage |
| 导入行为 | **默认合并**；精确重名 **或** 名称相似度 ≥ 阈值 → 弹冲突 UI 逐个选（保留现有 / 用导入的 / 两个都留） |
| 多用户 | **埋接缝**：按 `users/<userId>.json` 存，userId 暂固定 `"default"`，未来补认证 + `getUserId` 即可 |

### 默认参数
- 相似度阈值：**0.8**
- 推送防抖：**800ms**
- 数据目录：`server/data/users/<userId>.json`（`default` 用户即 `server/data/users/default.json`）
- `server/data/` 加入 `.gitignore`（个人数据不进仓库）

---

## 3. 架构与数据流

```
┌────────────────────────────────────────────────┐
│ 浏览器 (React)                                    │
│  useRecipeStore (state)                          │
│    ├─ localStorage 镜像缓存 (秒开 / 离线查看)      │
│    └─ dishesApi (GET/PUT，防抖推送)               │
│  recipeBackup (导出 / 导入解析 / 合并 / 相似度)    │
└───────────────┬──────────────────────────────────┘
                │ GET/PUT /api/dishes
┌───────────────▼──────────────────────────────────┐
│ 本地后端 (Express, localhost:4000 / 生产同机)      │
│  getUserId(req) → "default"（接缝）                │
│  原子读写 server/data/users/<userId>.json          │
└────────────────────────────────────────────────────┘
```

**启动时（useRecipeStore 挂载）：**
1. `GET /api/dishes`。
2. 后端有数据 → 用后端数据，并镜像到 localStorage。
3. 后端为空 **且** localStorage 有数据 → **自动迁移**：把本地数据 `PUT` 到后端 seed。
4. 后端连不上 → 用 localStorage 缓存（降级），下次写操作时重试推送。

**增删改时：**
1. 更新 React state + localStorage（即时）。
2. **防抖 800ms** 后把整库（dishes + categories）`PUT` 到后端。

---

## 4. 后端设计（改动小）

文件：`server/index.js`（或抽到 `server/dishesStore.js` 保持 index.js 不臃肿）

- `getUserId(req)`：当前 `return 'default'`。**多用户接缝**——未来从认证会话取真实 userId。
- 文件路径：`path.join(__dirname, 'data', 'users', getUserId(req) + '.json')`，目录不存在则创建。
- `GET /api/dishes`
  - 文件不存在 → 返回 `{ dishes: [], categories: <默认分类>, updatedAt: null }`。
  - 存在 → 读取并返回。
- `PUT /api/dishes`
  - body：`{ dishes, categories }`，做基本校验（dishes 为数组等）。
  - **原子写**：写 `<file>.tmp` 再 `fs.rename` 覆盖，避免写一半损坏。
  - 写入 `updatedAt = <服务端时间>`，返回 `{ ok: true, updatedAt }`。
- 并发：单用户最后写入生效；原子写保证文件不损坏。

---

## 5. 前端设计（主要工作量，按职责拆分小模块）

### 5.1 `src/api/dishesApi.js`（新增）
- `fetchDishes()` → `GET`，带超时（如 4s）；失败抛出可识别错误供降级。
- `pushDishes({ dishes, categories })` → `PUT`。
- 不含业务逻辑，纯 HTTP 封装。

### 5.2 `src/utils/recipeBackup.js`（新增，纯函数，易单测）
- `buildBackup(dishes, categories)` → `{ version: 1, exportedAt, dishes, categories }`。
- `parseBackup(text)` → 校验格式/版本，返回 `{ dishes, categories }` 或抛错。
- `nameSimilarity(a, b)` → 名称归一化（去空格）后字符级 **Dice 系数**，返回 0–1。对中文菜名稳，无额外依赖。
- `mergeLibrary(current, incoming, threshold=0.8)` → 返回 `{ merged, conflicts }`：
  - 无重名、无高相似 → 直接进 merged；
  - 精确重名 或 相似度 ≥ 阈值 → 收集为 conflict（含 current 项与 incoming 项），不自动合并。

### 5.3 `src/hooks/useRecipeStore.js`（改造）
- 保持现有对外 API（`saveDish/saveDishes/removeDish/...`）不变，**最小化对 `App.jsx` 的影响**。
- 新增：挂载时同步逻辑（见 §3）、防抖推送、迁移、降级标志（如 `syncState: 'synced' | 'local-only' | 'syncing'`）。
- 注意 CLAUDE.md 行数红线：同步/防抖逻辑抽成独立函数或小 hook（如 `useBackendSync`），避免 `useRecipeStore` 膨胀超阈值。

### 5.4 导出 / 导入 UI（`App.jsx` + 组件）
- **导出**：`buildBackup` → Blob 下载 `kitchen-backup_<YYYY-MM-DD>.json`。复用现有 Blob 下载方式。
- **导入**：选文件 → `parseBackup` → `mergeLibrary`：
  - 无冲突 → 直接应用，整库 PUT + 刷新缓存，Toast 成功。
  - 有冲突 → 打开**冲突解决弹窗**，逐个展示「现有 vs 导入」，选 保留现有 / 用导入的 / 两个都留（两个都留时给导入项改名，如加后缀）。解决完 → 应用 + PUT。
- 入口位置：跟现有导出按钮同区域（沿用现有 UI 模式，不新造风格）。

---

## 6. 失败与边界处理

- 后端不可达（加菜/导入/推送时）：Toast 提示「后端未连接，已暂存本地，连上后自动同步」；保留本地数据，下次写操作重试推送。
- 导入文件非法 / 版本不符：明确报错，**绝不破坏现有库**。
- 整库替换场景（若未来加该选项）：替换前自动导出一份当前数据兜底。本次默认走合并，不含纯替换入口。
- 原子写失败：返回 5xx，前端按"后端不可达"降级处理。

---

## 7. 测试计划

- **后端**：GET（空文件/有文件）、PUT（正常/非法 body）、原子写（写入后文件完整可解析）、连续 PUT 不损坏文件、`getUserId` 路径正确。
- **纯函数单测**（`recipeBackup`）：`nameSimilarity`（相同/相似/不同/中文）、`mergeLibrary`（全新、精确重名、高相似、空库、阈值边界）、`parseBackup`（合法/缺字段/版本不符）。
- **迁移**：localStorage 有数据 + 后端空 → 正确 seed 到后端。
- **集成**：启动同步三分支（后端有/后端空+本地有/后端不可达）。

---

## 8. 多用户未来工作（仅记录，本次不做）

1. 加认证（登录/会话或 token）——主要成本，涉及密码/会话/安全。
2. 把 `getUserId(req)` 从固定 `"default"` 改为从认证态取真实用户。
3. 前端加登录态与凭证传递。
- 存储结构（`users/<userId>.json`）本次已就位，届时**无需迁移数据、不动存储层**。

---

## 9. 涉及文件清单

- 改：`server/index.js`（+ 可选抽 `server/dishesStore.js`）
- 新：`src/api/dishesApi.js`、`src/utils/recipeBackup.js`、冲突解决弹窗组件
- 改：`src/hooks/useRecipeStore.js`、`src/App.jsx`（导出/导入入口）
- 改：`.gitignore`（加 `server/data/`）
- 文档：相关 L2/L3 文件头与模块 `CLAUDE.md` 同步更新（遵循分形文档规范）
