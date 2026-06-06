/**
 * [IN]: 无
 * [OUT]: CAT_COLORS — 食材分类→配色映射（保持原值）
 * [POS]: 被 ResultsView、DishEditor 的食材标签/选择器复用
 * [PROTOCOL]: 变更分类配色时同步更新本头部与消费方
 */
export const CAT_COLORS = {
    '主料': { bg: 'var(--color-rose)', border: 'var(--color-rose-border)' },
    '蔬菜': { bg: 'var(--color-mint)', border: 'var(--color-mint-border)' },
    '调料': { bg: 'var(--color-peach)', border: 'var(--color-peach-border)' },
    '香料': { bg: 'var(--color-lavender)', border: 'var(--color-lavender-border)' },
    '液体': { bg: 'var(--color-blue)', border: 'var(--color-blue-border)' },
    '其他': { bg: 'var(--color-paper)', border: 'var(--color-ink)' }
};
