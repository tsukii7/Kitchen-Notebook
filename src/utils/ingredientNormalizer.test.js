import { describe, it, expect } from 'vitest';
import { mergeIngredients, categorizeIngredient } from './ingredientNormalizer.js';

describe('categorizeIngredient — sesame is a seasoning', () => {
    it('puts 白芝麻 in 调料 when no valid stored category', () => {
        expect(categorizeIngredient('白芝麻', '其他')).toBe('调料');
        expect(categorizeIngredient('白芝麻')).toBe('调料');
    });
    it('keeps 黑芝麻 in 调料', () => {
        expect(categorizeIngredient('黑芝麻', '其他')).toBe('调料');
    });
    it('still respects a valid AI category for 芝麻油 (液体)', () => {
        expect(categorizeIngredient('芝麻油', '液体')).toBe('液体');
    });
});

describe('categorizeIngredient — 葱/蒜/姜 forced to 蔬菜', () => {
    it('forces any name containing 葱/蒜/姜 to 蔬菜, overriding AI category', () => {
        for (const n of ['葱', '小葱', '大葱', '葱花', '大葱白', '蒜', '大蒜', '蒜末', '姜', '生姜', '姜丝', '青蒜']) {
            expect(categorizeIngredient(n, '香料')).toBe('蔬菜');
        }
    });

    it('keeps dried-spice ginger forms (沙姜/良姜/干姜/姜黄) out of 蔬菜', () => {
        expect(categorizeIngredient('沙姜', '香料')).toBe('香料');
        expect(categorizeIngredient('高良姜', '香料')).toBe('香料');
        expect(categorizeIngredient('干姜', '香料')).toBe('香料');
        expect(categorizeIngredient('姜黄粉', '香料')).toBe('香料');
    });
});

const dish = (name, ingredients) => ({ dish_name: name, ingredients });

describe('mergeIngredients — exact-name merging only', () => {
    it('does NOT merge 干辣椒 and 辣椒 (different names)', () => {
        const out = mergeIngredients([
            dish('A', [{ name: '干辣椒', amount: '40', unit: 'g', category: '香料' }]),
            dish('B', [{ name: '辣椒', amount: '100', unit: 'g', category: '蔬菜' }]),
        ]);
        const names = out.map(i => i.name);
        expect(names).toContain('干辣椒');
        expect(names).toContain('辣椒');
        expect(out).toHaveLength(2);
    });

    it('DOES merge whitelisted true synonyms 西红柿 + 番茄 into one (canonical 番茄)', () => {
        const out = mergeIngredients([
            dish('A', [{ name: '西红柿', amount: '2', unit: '个', category: '蔬菜' }]),
            dish('B', [{ name: '番茄', amount: '1', unit: '个', category: '蔬菜' }]),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].name).toBe('番茄');
        expect(out[0].amount).toContain('3');
        expect(out[0].sources).toEqual(['A', 'B']);
    });

    it('DOES merge 土豆 + 马铃薯 (canonical 土豆)', () => {
        const out = mergeIngredients([
            dish('A', [{ name: '马铃薯', amount: '200', unit: 'g', category: '蔬菜' }]),
            dish('B', [{ name: '土豆', amount: '50', unit: 'g', category: '蔬菜' }]),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].name).toBe('土豆');
        expect(out[0].amount).toContain('250');
    });

    it('does NOT merge non-whitelisted different items like 生抽 and 老抽', () => {
        const out = mergeIngredients([
            dish('A', [{ name: '生抽', amount: '10', unit: 'g', category: '调料' }]),
            dish('B', [{ name: '老抽', amount: '5', unit: 'g', category: '调料' }]),
        ]);
        expect(out).toHaveLength(2);
        expect(out.map(i => i.name).sort()).toEqual(['生抽', '老抽'].sort());
    });

    it('merges and sums ingredients whose names are exactly identical', () => {
        const out = mergeIngredients([
            dish('A', [{ name: '辣椒', amount: '40', unit: 'g', category: '蔬菜' }]),
            dish('B', [{ name: '辣椒', amount: '100', unit: 'g', category: '蔬菜' }]),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].name).toBe('辣椒');
        expect(out[0].amount).toContain('140');
        expect(out[0].sources).toEqual(['A', 'B']);
    });

    it('treats names differing only by whitespace as the same (trim)', () => {
        const out = mergeIngredients([
            dish('A', [{ name: ' 盐 ', amount: '2', unit: 'g', category: '调料' }]),
            dish('B', [{ name: '盐', amount: '3', unit: 'g', category: '调料' }]),
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].name).toBe('盐');
    });
});
