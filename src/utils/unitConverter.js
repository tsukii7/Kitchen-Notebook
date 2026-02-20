/* ============================================
   Unit Conversion System
   Handles g↔kg, ml↔L, tsp/tbsp/cup, 斤/两
   Count units preserved, cross-dimension warnings
   ============================================ */

export const UNIT_SYSTEM = {
    volume: {
        base: 'ml',
        displayName: '体积',
        units: {
            'ml': 1, '毫升': 1,
            'l': 1000, 'L': 1000, '升': 1000,
            '杯': 240, 'cup': 240, 'cups': 240,
            '汤匙': 15, '大匙': 15, 'tbsp': 15,
            '茶匙': 5, '小匙': 5, 'tsp': 5,
        }
    },
    weight: {
        base: 'g',
        displayName: '质量',
        units: {
            'g': 1, '克': 1,
            'kg': 1000, '千克': 1000, '公斤': 1000,
            '斤': 500, '两': 50,
            '磅': 453.592, 'lb': 453.592, 'lbs': 453.592,
            '盎司': 28.3495, 'oz': 28.3495,
        }
    },
    count: {
        base: null,
        displayName: '计数',
        units: {
            '个': null, '根': null, '片': null, '块': null,
            '颗': null, '条': null, '只': null, '瓣': null,
            '段': null, '朵': null, '把': null, '棵': null,
            '头': null, '粒': null, '枚': null, '勺': null,
            '碗': null, '盘': null, '包': null, '袋': null,
            '罐': null, '瓶': null, '盒': null,
        }
    }
};

/** Vague quantity terms that cannot be converted */
export const VAGUE_QUANTITIES = [
    '适量', '少许', '若干', '一些', '半', '一点', '一丁点',
    '少量', '酌量', '数片', '数根', '数个', '随意',
];

/**
 * Find which group a unit belongs to and its conversion factor
 */
export function findUnitGroup(unit) {
    if (!unit) return null;
    const normalized = unit.trim();
    for (const [groupName, group] of Object.entries(UNIT_SYSTEM)) {
        for (const [unitName, factor] of Object.entries(group.units)) {
            if (unitName === normalized || unitName.toLowerCase() === normalized.toLowerCase()) {
                return { group: groupName, unit: unitName, factor, base: group.base, displayName: group.displayName };
            }
        }
    }
    return null;
}

/**
 * Convert a quantity from one unit to the base unit of its group
 */
export function convertToBase(quantity, unit) {
    const info = findUnitGroup(unit);
    if (!info || info.factor === null) {
        return { quantity, unit, converted: false };
    }
    return {
        quantity: quantity * info.factor,
        unit: info.base,
        group: info.group,
        converted: true,
    };
}

/**
 * Format a quantity nicely (avoid unnecessary decimals)
 */
export function formatQuantity(num) {
    if (num == null || isNaN(num)) return '';
    if (Number.isInteger(num)) return num.toString();
    return (Math.round(num * 100) / 100).toString();
}

/**
 * Smart display: convert base units back to human-readable for large/small amounts
 */
export function smartDisplay(quantity, baseUnit) {
    if (baseUnit === 'ml') {
        if (quantity >= 1000) return `${formatQuantity(quantity / 1000)} L`;
        return `${formatQuantity(quantity)} ml`;
    }
    if (baseUnit === 'g') {
        if (quantity >= 1000) return `${formatQuantity(quantity / 1000)} kg`;
        return `${formatQuantity(quantity)} g`;
    }
    return `${formatQuantity(quantity)} ${baseUnit}`;
}

/**
 * Check if a quantity string is vague
 */
export function isVagueQuantity(quantityStr) {
    if (!quantityStr) return true;
    return VAGUE_QUANTITIES.some(v => String(quantityStr).includes(v));
}
