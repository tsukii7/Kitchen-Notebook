/**
 * [IN]: 无外部依赖（纯函数）
 * [OUT]: buildShoppingListText — 合并清单 → 分类 markdown 勾选文本（适合微信/备忘录）
 * [POS]: 被 CookingQueue 的「复制文字版」按钮消费
 * [PROTOCOL]: 变更导出格式时同步更新本头部、src/utils 模块文档与设计
 */
const KNOWN_CATEGORIES = ['主料', '蔬菜', '调料', '香料', '液体'];
const CATEGORY_ORDER = [...KNOWN_CATEGORIES, '其他'];

// 常备品（自来水类），不计入采购清单
const NON_PURCHASABLE = new Set(['水', '清水', '开水', '热水', '凉水', '温水', '冷水', '沸水']);

/** 过滤掉无需采购的食材（如清水/水/开水），供文字版与 app 内合并清单共用 */
export function excludeNonPurchasable(list) {
    return (list || []).filter((i) => !NON_PURCHASABLE.has((i.name || '').trim()));
}

// 同类食材聚类排序用的「核心词」，按此顺序分组（不同葱排一起、不同姜排一起…）
const SIMILARITY_ANCHORS = [
    '葱', '姜', '蒜', '辣椒', '花椒', '胡椒', '椒',
    '番茄', '土豆', '萝卜', '茄', '豆腐', '豆', '菜',
    '排骨', '肉', '鸡', '牛', '鱼', '虾', '蛋', '米', '面',
    '盐', '糖', '醋', '生抽', '老抽', '酱油', '酱', '料酒', '黄酒', '酒',
    '蚝油', '芝麻', '淀粉', '粉', '油',
];

function similarityKey(name) {
    const idx = SIMILARITY_ANCHORS.findIndex((a) => (name || '').includes(a));
    return idx === -1 ? SIMILARITY_ANCHORS.length : idx;
}

/** 在同一分类内把同类食材排到相邻（先按核心词分组，组内按名称） */
export function sortBySimilarity(items) {
    return [...(items || [])].sort((a, b) => {
        const ka = similarityKey(a.name);
        const kb = similarityKey(b.name);
        if (ka !== kb) return ka - kb;
        return (a.name || '').localeCompare(b.name || '', 'zh');
    });
}

function categoryOf(item) {
    return KNOWN_CATEGORIES.includes(item.category) ? item.category : '其他';
}

function ingredientLine(item) {
    const amt = (item.amount || '').trim();
    // amount 已含各单位（如「适量 + 5 g」），不再追加单位冲突提示
    return `- [ ] ${item.name}${amt ? ' ' + amt : ''}`;
}

export function buildShoppingListText(dishNames, mergedList) {
    const items = excludeNonPurchasable(mergedList);
    const title = `采购清单（${(dishNames || []).join(' + ')}）`;
    const count = `共 ${items.length} 项食材`;
    const blocks = CATEGORY_ORDER.map((cat) => {
        const inCat = sortBySimilarity(items.filter((i) => categoryOf(i) === cat));
        if (inCat.length === 0) return null;
        return `${cat}\n${inCat.map(ingredientLine).join('\n')}`;
    }).filter(Boolean);
    return `${title}\n${count}\n\n${blocks.join('\n\n')}`;
}
