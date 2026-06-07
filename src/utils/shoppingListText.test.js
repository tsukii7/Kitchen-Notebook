import { describe, it, expect } from 'vitest';
import { buildShoppingListText } from './shoppingListText.js';

const sample = [
    { name: '鸡蛋', amount: '3个', category: '主料', warning: false },
    { name: '西红柿', amount: '2个', category: '蔬菜', warning: false },
    { name: '盐', amount: '适量 + 5 g', category: '调料', warning: true },
    { name: '葱', amount: '20 g', category: '香料', warning: false },
];

describe('buildShoppingListText', () => {
    it('starts with a title containing dish names and an item count', () => {
        const txt = buildShoppingListText(['西红柿炒鸡蛋', '麻婆豆腐'], sample);
        expect(txt.split('\n')[0]).toBe('采购清单（西红柿炒鸡蛋 + 麻婆豆腐）');
        expect(txt).toContain('共 4 项食材');
    });

    it('renders each item as a markdown checkbox line', () => {
        const txt = buildShoppingListText(['A'], sample);
        expect(txt).toContain('- [ ] 鸡蛋 3个');
        expect(txt).toContain('- [ ] 西红柿 2个');
    });

    it('groups items under category headers in fixed order', () => {
        const txt = buildShoppingListText(['A'], sample);
        const iMain = txt.indexOf('主料');
        const iVeg = txt.indexOf('蔬菜');
        const iSeason = txt.indexOf('调料');
        expect(iMain).toBeGreaterThan(-1);
        expect(iMain).toBeLessThan(iVeg);
        expect(iVeg).toBeLessThan(iSeason);
    });

    it('keeps all units visible without appending a conflict note', () => {
        const txt = buildShoppingListText(['A'], sample);
        expect(txt).toContain('- [ ] 盐 适量 + 5 g');
        expect(txt).not.toContain('单位冲突');
    });

    it('skips empty categories', () => {
        const txt = buildShoppingListText(['A'], [{ name: '鸡蛋', amount: '3个', category: '主料', warning: false }]);
        expect(txt).not.toContain('蔬菜');
        expect(txt).not.toContain('调料');
    });

    it('puts unknown categories under 其他', () => {
        const txt = buildShoppingListText(['A'], [{ name: '神秘物', amount: '1', category: 'XYZ', warning: false }]);
        expect(txt).toContain('其他');
        expect(txt).toContain('- [ ] 神秘物 1');
    });

    it('handles items without an amount', () => {
        const txt = buildShoppingListText(['A'], [{ name: '盐', amount: '', category: '调料', warning: false }]);
        expect(txt).toContain('- [ ] 盐');
        expect(txt).not.toContain('- [ ] 盐 （');
    });
});
