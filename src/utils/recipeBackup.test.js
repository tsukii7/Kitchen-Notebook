import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, nameSimilarity, mergeLibrary } from './recipeBackup.js';

describe('buildBackup / parseBackup roundtrip', () => {
    it('builds a versioned backup and parses it back', () => {
        const backup = buildBackup([{ dish_name: '番茄炒蛋' }], ['素菜']);
        expect(backup.version).toBe(1);
        expect(backup.dishes).toHaveLength(1);
        const parsed = parseBackup(JSON.stringify(backup));
        expect(parsed.dishes[0].dish_name).toBe('番茄炒蛋');
        expect(parsed.categories).toEqual(['素菜']);
    });
});

describe('parseBackup validation', () => {
    it('throws on non-JSON', () => {
        expect(() => parseBackup('not json')).toThrow();
    });
    it('throws on wrong version', () => {
        expect(() => parseBackup(JSON.stringify({ version: 99, dishes: [] }))).toThrow();
    });
    it('throws when dishes missing', () => {
        expect(() => parseBackup(JSON.stringify({ version: 1 }))).toThrow();
    });
});

describe('nameSimilarity', () => {
    it('returns 1 for identical names ignoring spaces', () => {
        expect(nameSimilarity('泡椒 牛肉', '泡椒牛肉')).toBe(1);
    });
    it('returns high score for similar names', () => {
        expect(nameSimilarity('泡椒牛肉', '泡椒牛柳')).toBeGreaterThan(0.5);
    });
    it('returns low score for unrelated names', () => {
        expect(nameSimilarity('番茄炒蛋', '红烧排骨')).toBeLessThan(0.3);
    });
    it('handles single-char names by exact compare', () => {
        expect(nameSimilarity('蛋', '蛋')).toBe(1);
        expect(nameSimilarity('蛋', '肉')).toBe(0);
    });
});

describe('mergeLibrary', () => {
    it('adds brand-new dishes', () => {
        const { merged, conflicts } = mergeLibrary([{ dish_name: 'A' }], [{ dish_name: 'B' }]);
        expect(merged).toHaveLength(2);
        expect(conflicts).toHaveLength(0);
    });
    it('flags exact-name duplicates as conflicts', () => {
        const { merged, conflicts } = mergeLibrary([{ dish_name: '番茄炒蛋' }], [{ dish_name: '番茄炒蛋' }]);
        expect(merged).toHaveLength(1);
        expect(conflicts).toHaveLength(1);
        expect(conflicts[0].incoming.dish_name).toBe('番茄炒蛋');
    });
    it('flags high-similarity dishes as conflicts', () => {
        const { conflicts } = mergeLibrary([{ dish_name: '泡椒牛肉' }], [{ dish_name: '泡椒 牛肉' }], 0.8);
        expect(conflicts).toHaveLength(1);
    });
    it('supports name field as fallback to dish_name', () => {
        const { conflicts } = mergeLibrary([{ name: '番茄炒蛋' }], [{ dish_name: '番茄炒蛋' }]);
        expect(conflicts).toHaveLength(1);
    });
});
