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
