/* ============================================
   Ingredient Normalizer
   Synonym mapping, modifier stripping, merge logic
   ============================================ */

import {
    findUnitGroup, convertToBase, formatQuantity,
    smartDisplay, isVagueQuantity
} from './unitConverter.js';

/** Synonym map: key = canonical name, values = aliases */
const SYNONYM_MAP = {
    '番茄': ['西红柿', '蕃茄'],
    '土豆': ['马铃薯', '洋芋'],
    '香菜': ['芫荽', '香荽'],
    '葱': ['小葱', '葱花', '香葱', '青葱', '大葱'],
    '姜': ['生姜', '老姜', '嫩姜', '姜片', '姜丝'],
    '蒜': ['大蒜', '蒜头', '蒜瓣', '蒜末', '蒜片'],
    '辣椒': ['尖椒', '青椒', '红椒', '小米辣', '朝天椒', '干辣椒', '辣椒干'],
    '酱油': ['生抽', '老抽', '酱油'],
    '醋': ['白醋', '米醋', '陈醋', '香醋'],
    '料酒': ['黄酒', '米酒', '烹饪酒'],
    '花椒': ['花椒粒', '花椒粉'],
    '胡椒': ['胡椒粉', '黑胡椒', '白胡椒'],
    '食用油': ['植物油', '菜籽油', '玉米油', '花生油', '大豆油', '橄榄油', '色拉油', '调和油'],
    '鸡蛋': ['蛋', '鸡子'],
    '淀粉': ['生粉', '玉米淀粉', '土豆淀粉', '红薯淀粉'],
    '豆腐': ['嫩豆腐', '老豆腐', '北豆腐', '南豆腐'],
    '白糖': ['砂糖', '细砂糖', '绵白糖'],
    '味精': ['鸡精', '味素'],
};

/** Modifiers to strip (preserved in notes) */
const MODIFIERS = [
    '新鲜的', '新鲜', '切碎的', '切碎', '切丝的', '切丝',
    '切块的', '切块', '切片的', '切片', '去皮的', '去皮',
    '去籽的', '去籽', '洗净的', '洗净', '泡发的', '泡发',
    '干的', '干', '腌制的', '腌制', '煮熟的', '煮熟',
    '剁碎的', '剁碎', '磨碎的', '磨碎',
];

/** Ingredient categories for shopping list display */
const CATEGORIES = {
    '主料': ['猪肉', '牛肉', '羊肉', '鸡肉', '鸡胸肉', '鸡腿', '鸡翅', '排骨', '五花肉', '里脊', '肉末', '肉丝', '肉片', '鸭肉', '鸭头', '鸭脖', '鸭掌', '鸭翅', '鸭肠', '虾', '鱼', '鱼片', '豆腐', '鸡蛋', '面粉', '面条', '米饭', '米', '饭'],
    '蔬菜': ['土豆', '番茄', '白菜', '青菜', '菠菜', '芹菜', '韭菜', '生菜', '黄瓜', '茄子', '辣椒', '豆芽', '木耳', '香菇', '金针菇', '蘑菇', '洋葱', '胡萝卜', '萝卜', '南瓜', '冬瓜', '丝瓜', '苦瓜', '莲藕', '山药', '玉米', '毛豆', '豌豆', '花菜', '西兰花', '包菜', '卷心菜', '笋'],
    '调料': ['盐', '酱油', '醋', '白糖', '味精', '鸡精', '料酒', '蚝油', '豆瓣酱', '甜面酱', '番茄酱', '沙拉酱', '烧烤酱', '辣椒酱', '芝麻酱', '豆豉', '淀粉', '五香粉', '十三香', '咖喱粉', '孜然'],
    '香料': ['葱', '姜', '蒜', '花椒', '胡椒', '八角', '桂皮', '香叶', '干辣椒', '香菜', '小茴香', '丁香', '草果', '陈皮'],
    '液体': ['食用油', '芝麻油', '水', '高汤', '牛奶', '椰奶', '啤酒'],
};

// Build reverse lookup: ingredient name → canonical name
const _reverseSynonyms = {};
for (const [canonical, aliases] of Object.entries(SYNONYM_MAP)) {
    _reverseSynonyms[canonical] = canonical;
    for (const alias of aliases) {
        _reverseSynonyms[alias] = canonical;
    }
}

/**
 * Normalize an ingredient name: strip modifiers, map synonyms
 */
export function normalizeName(rawName) {
    let name = rawName.trim();
    const notes = [];

    // Strip modifiers
    for (const mod of MODIFIERS) {
        if (name.includes(mod)) {
            notes.push(mod);
            name = name.replace(mod, '').trim();
        }
    }

    // Map synonyms
    const canonical = _reverseSynonyms[name];
    const wasRenamed = canonical && canonical !== name;

    return {
        original: rawName.trim(),
        normalized: canonical || name,
        wasRenamed,
        notes,
    };
}

/**
 * Categorize an ingredient
 * @param {string} name - Ingredient name
 * @param {string} [aiCategory] - Optional category returned by AI
 */
export function categorizeIngredient(name, aiCategory) {
    // If AI provided a valid category, trust it (mostly)
    const validCategories = Object.keys(CATEGORIES);
    if (aiCategory && validCategories.includes(aiCategory)) {
        return aiCategory;
    }

    // Fallback to keyword matching
    const normalized = normalizeName(name).normalized;
    for (const [category, items] of Object.entries(CATEGORIES)) {
        if (items.some(item => normalized.includes(item) || item.includes(normalized))) {
            return category;
        }
    }
    return '其他';
}

/**
 * Merge all ingredients from multiple dishes into a shopping list.
 * Returns array of { name, amounts[], warning, warningText, sources, category }
 */
export function mergeIngredients(allDishes) {
    const merged = {};

    for (const dish of allDishes) {
        for (const ing of (dish.ingredients || [])) {
            const { normalized: name, wasRenamed, original, notes } = normalizeName(ing.name);
            if (!name) continue;

            if (!merged[name]) {
                merged[name] = {
                    name,
                    entries: [],
                    sources: [],
                    renames: [],
                    notes: [],
                    category: categorizeIngredient(name, ing.category),
                };
            }

            merged[name].entries.push({
                quantity: ing.amount ?? ing.quantity,
                unit: ing.unit || '',
                dishName: dish.dish_name || dish.name,
            });

            const dishName = dish.dish_name || dish.name;
            if (!merged[name].sources.includes(dishName)) {
                merged[name].sources.push(dishName);
            }
            if (wasRenamed && !merged[name].renames.includes(original)) {
                merged[name].renames.push(original);
            }
            if (notes.length > 0) {
                merged[name].notes.push(...notes);
            }
        }
    }

    const result = [];

    for (const [name, data] of Object.entries(merged)) {
        const buckets = {};
        const unconvertible = [];
        let hasWarning = false;
        let warningTexts = [];
        const mixedGroups = new Set();

        for (const entry of data.entries) {
            const qStr = String(entry.quantity || '');

            // Check for vague quantities
            if (isVagueQuantity(qStr) || (!entry.quantity && !entry.unit)) {
                unconvertible.push(qStr || '适量');
                warningTexts.push('无法量化');
                hasWarning = true;
                continue;
            }

            const q = parseFloat(qStr);
            if (isNaN(q)) {
                unconvertible.push(`${qStr}${entry.unit || ''}`);
                continue;
            }

            const info = findUnitGroup(entry.unit);
            if (!info) {
                unconvertible.push(`${entry.quantity}${entry.unit || ''}`);
                continue;
            }

            mixedGroups.add(info.group);

            if (info.group === 'count') {
                const key = `count_${entry.unit}`;
                if (!buckets[key]) {
                    buckets[key] = { quantity: 0, unit: entry.unit, group: 'count' };
                }
                buckets[key].quantity += q;
            } else {
                const converted = convertToBase(q, entry.unit);
                if (!buckets[info.group]) {
                    buckets[info.group] = { quantity: 0, unit: converted.unit, group: info.group };
                }
                buckets[info.group].quantity += converted.quantity;
            }
        }

        // Cross-dimension check
        const hasCount = mixedGroups.has('count');
        const hasWeight = mixedGroups.has('weight');
        const hasVolume = mixedGroups.has('volume');
        if ((hasCount && (hasWeight || hasVolume)) || (hasWeight && hasVolume)) {
            hasWarning = true;
            warningTexts.push('计数与重量/体积无法自动合并');
        }
        if (unconvertible.length > 0 && Object.keys(buckets).length > 0) {
            hasWarning = true;
        }

        // Build display amounts
        const amounts = [];
        for (const bucket of Object.values(buckets)) {
            if (bucket.group === 'count') {
                amounts.push(`${formatQuantity(bucket.quantity)} ${bucket.unit}`);
            } else {
                amounts.push(smartDisplay(bucket.quantity, bucket.unit));
            }
        }
        for (const uc of unconvertible) {
            amounts.push(uc);
        }

        // Unique warning texts
        const uniqueWarnings = [...new Set(warningTexts)];

        result.push({
            name,
            amount: amounts.join(' + '),
            amounts,
            warning: hasWarning,
            warningText: uniqueWarnings.join('；'),
            sources: data.sources,
            renames: data.renames,
            notes: [...new Set(data.notes)],
            category: data.category,
        });
    }

    return result;
}

export { CATEGORIES };
