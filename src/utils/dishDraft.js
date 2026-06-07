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
