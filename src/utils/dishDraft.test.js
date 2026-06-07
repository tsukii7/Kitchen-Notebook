import { describe, it, expect } from 'vitest';
import { emptyIngredient, normalizeDishDraft } from './dishDraft.js';

describe('emptyIngredient', () => {
    it('always includes a unit field (empty string)', () => {
        expect(emptyIngredient()).toEqual({ name: '', amount: '', unit: '', category: '主料' });
    });
});

describe('normalizeDishDraft', () => {
    it('preserves the unit field on ingredients', () => {
        const out = normalizeDishDraft({
            dish_name: '番茄炒蛋',
            category: '素菜',
            ingredients: [{ name: '番茄', amount: '2', unit: '个', category: '蔬菜' }],
            steps: ['切番茄'],
        });
        expect(out.ingredients[0]).toEqual({ name: '番茄', amount: '2', unit: '个', category: '蔬菜' });
    });
    it('fills missing unit with empty string instead of dropping it', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [{ name: '盐', amount: '少许' }], steps: [] });
        expect(out.ingredients[0]).toEqual({ name: '盐', amount: '少许', unit: '', category: '主料' });
    });
    it('drops ingredient rows with blank name', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [{ name: '', amount: '1', unit: 'g' }, { name: '糖', amount: '2', unit: 'g' }], steps: [] });
        expect(out.ingredients).toHaveLength(1);
        expect(out.ingredients[0].name).toBe('糖');
    });
    it('drops blank steps after trim', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [], steps: ['  ', '炒', ''] });
        expect(out.steps).toEqual(['炒']);
    });
    it('falls back to provided fallback name when dish_name is blank', () => {
        const out = normalizeDishDraft({ dish_name: '   ', ingredients: [], steps: [] }, '原菜名');
        expect(out.dish_name).toBe('原菜名');
    });
    it('falls back to 未命名菜谱 when blank and no fallback', () => {
        const out = normalizeDishDraft({ dish_name: '', ingredients: [], steps: [] });
        expect(out.dish_name).toBe('未命名菜谱');
    });
    it('defaults category to 未分类 when missing', () => {
        const out = normalizeDishDraft({ dish_name: 'A', ingredients: [], steps: [] });
        expect(out.category).toBe('未分类');
    });
    it('preserves passed-through meta fields like _id and _savedAt', () => {
        const out = normalizeDishDraft({ _id: 'x1', _savedAt: 123, dish_name: 'A', ingredients: [], steps: [] });
        expect(out._id).toBe('x1');
        expect(out._savedAt).toBe(123);
    });
});
