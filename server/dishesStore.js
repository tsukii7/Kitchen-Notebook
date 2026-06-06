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
        return { dishes: [], categories: [...DEFAULT_CATEGORIES], updatedAt: null };
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || !Array.isArray(data.dishes)) {
        throw new Error(`菜库文件格式损坏: ${file}`);
    }
    return data;
}

function atomicReplace(tmp, file) {
    try {
        fs.renameSync(tmp, file);
    } catch {
        // Windows can throw EPERM renaming onto an existing file; fall back to copy
        fs.copyFileSync(tmp, file);
        fs.unlinkSync(tmp);
    }
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
        categories: Array.isArray(categories) ? categories : [...DEFAULT_CATEGORIES],
        updatedAt: updatedAt ?? null,
    };
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    atomicReplace(tmp, file);
    return payload;
}
