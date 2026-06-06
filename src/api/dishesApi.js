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
