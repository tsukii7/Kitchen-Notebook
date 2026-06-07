/**
 * [IN]: 无外部依赖（纯函数）
 * [OUT]: buildShoppingListText — 合并清单 → 分类 markdown 勾选文本（适合微信/备忘录）
 * [POS]: 被 CookingQueue 的「复制文字版」按钮消费
 * [PROTOCOL]: 变更导出格式时同步更新本头部、src/utils 模块文档与设计
 */
const KNOWN_CATEGORIES = ['主料', '蔬菜', '调料', '香料', '液体'];
const CATEGORY_ORDER = [...KNOWN_CATEGORIES, '其他'];

function categoryOf(item) {
    return KNOWN_CATEGORIES.includes(item.category) ? item.category : '其他';
}

function ingredientLine(item) {
    const amt = (item.amount || '').trim();
    const base = `- [ ] ${item.name}${amt ? ' ' + amt : ''}`;
    // 单位冲突时 amount 已含各单位（如「适量 + 5 g」），再标注提醒核对
    return item.warning ? `${base}（单位冲突，请核对）` : base;
}

export function buildShoppingListText(dishNames, mergedList) {
    const items = mergedList || [];
    const title = `采购清单（${(dishNames || []).join(' + ')}）`;
    const count = `共 ${items.length} 项食材`;
    const blocks = CATEGORY_ORDER.map((cat) => {
        const inCat = items.filter((i) => categoryOf(i) === cat);
        if (inCat.length === 0) return null;
        return `${cat}\n${inCat.map(ingredientLine).join('\n')}`;
    }).filter(Boolean);
    return `${title}\n${count}\n\n${blocks.join('\n\n')}`;
}
