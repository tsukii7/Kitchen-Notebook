import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getUserId, readLibrary, writeLibrary } from './dishesStore.js';

let baseDir;

beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dishes-test-'));
});
afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
});

describe('getUserId', () => {
    it('returns "default" as the multi-user seam', () => {
        expect(getUserId({})).toBe('default');
    });
});

describe('readLibrary', () => {
    it('returns empty library with default categories when file missing', () => {
        const lib = readLibrary('default', baseDir);
        expect(lib.dishes).toEqual([]);
        expect(lib.categories).toContain('荤菜');
        expect(lib.updatedAt).toBeNull();
    });

    it('reads back what writeLibrary wrote', () => {
        writeLibrary('default', { dishes: [{ dish_name: '番茄炒蛋' }], categories: ['素菜'] }, '2026-06-06T00:00:00.000Z', baseDir);
        const lib = readLibrary('default', baseDir);
        expect(lib.dishes).toHaveLength(1);
        expect(lib.dishes[0].dish_name).toBe('番茄炒蛋');
        expect(lib.categories).toEqual(['素菜']);
        expect(lib.updatedAt).toBe('2026-06-06T00:00:00.000Z');
    });
});

describe('writeLibrary', () => {
    it('throws when dishes is not an array', () => {
        expect(() => writeLibrary('default', { dishes: 'nope' }, null, baseDir)).toThrow();
    });

    it('writes atomically leaving no .tmp file behind', () => {
        writeLibrary('default', { dishes: [], categories: [] }, null, baseDir);
        const leftovers = fs.readdirSync(baseDir).filter(f => f.endsWith('.tmp'));
        expect(leftovers).toEqual([]);
    });

    it('produces a file that is always valid JSON after repeated writes', () => {
        for (let i = 0; i < 5; i++) {
            writeLibrary('default', { dishes: [{ dish_name: 'd' + i }], categories: [] }, null, baseDir);
        }
        const lib = readLibrary('default', baseDir);
        expect(lib.dishes[0].dish_name).toBe('d4');
    });
});
