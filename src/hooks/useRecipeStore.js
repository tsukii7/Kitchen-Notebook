import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchLibrary, pushLibrary } from '../api/dishesApi.js';

const STORAGE_KEY = 'recipe_saved_dishes';
const QUEUE_KEY = 'recipe_cooking_queue';

function loadJSON(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch {
        return fallback;
    }
}

function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Hook for managing saved recipes and cooking queue.
 * - savedDishes: all saved dishes (persisted in localStorage)
 * - queue: dish IDs selected for ingredient merging
 */
export function useRecipeStore() {
    const [savedDishes, setSavedDishes] = useState(() => loadJSON(STORAGE_KEY, []));
    const [queue, setQueue] = useState(() => loadJSON(QUEUE_KEY, []));

    const [categories, setCategories] = useState(() => loadJSON('recipe_categories', ['荤菜', '素菜', '汤煲', '主食', '烘焙', '小吃']));

    // 后端同步状态：'syncing' | 'synced' | 'local-only'
    const [syncState, setSyncState] = useState('syncing');
    const hydratedRef = useRef(false);   // 是否已完成首次后端拉取
    const pushTimerRef = useRef(null);    // 防抖计时器

    // Migration & Validation
    useEffect(() => {
        const oldDefaults = ['早餐', '午餐', '晚餐', '甜点', '夜宵'];
        const newDefaults = ['荤菜', '素菜', '汤煲', '主食', '烘焙', '小吃'];

        // 1. Migration from old defaults
        if (JSON.stringify(categories) === JSON.stringify(oldDefaults)) {
            setCategories(newDefaults);
            return;
        }

        // 2. If completely empty, restore defaults
        if (categories.length === 0) {
            setCategories(newDefaults);
        }
    }, [categories]);

    // 挂载：从后端拉取；后端空但本地有数据则迁移；连不上则降级本地
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const lib = await fetchLibrary();
                if (cancelled) return;
                const hasRemote = Array.isArray(lib.dishes) && lib.dishes.length > 0;
                if (hasRemote) {
                    setSavedDishes(lib.dishes);
                    if (Array.isArray(lib.categories) && lib.categories.length) {
                        setCategories(lib.categories);
                    }
                    setSyncState('synced');
                } else if (savedDishes.length > 0) {
                    await pushLibrary({ dishes: savedDishes, categories });
                    setSyncState('synced');
                } else {
                    setSyncState('synced');
                }
            } catch {
                if (!cancelled) setSyncState('local-only');
            } finally {
                if (!cancelled) hydratedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist on change
    useEffect(() => { saveJSON(STORAGE_KEY, savedDishes); }, [savedDishes]);
    useEffect(() => { saveJSON(QUEUE_KEY, queue); }, [queue]);
    useEffect(() => { saveJSON('recipe_categories', categories); }, [categories]);

    // 菜/分类变更后防抖推送整库到后端（挂载拉取完成后才推，避免覆盖远端）
    useEffect(() => {
        if (!hydratedRef.current) return;
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = setTimeout(() => {
            setSyncState('syncing');
            pushLibrary({ dishes: savedDishes, categories })
                .then(() => setSyncState('synced'))
                .catch(() => setSyncState('local-only'));
        }, 800);
        return () => { if (pushTimerRef.current) clearTimeout(pushTimerRef.current); };
    }, [savedDishes, categories]);

    /** Generate a robust unique ID */
    const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    };

    /** Save a dish (skip if duplicate dish_name exists) */
    const saveDish = useCallback((dish) => {
        const name = dish.dish_name || dish.name || '未命名菜谱';
        const category = dish.category || '未分类';

        // Auto-register category if distinct and new
        if (category !== '未分类') {
            setCategories(prev => {
                if (!prev.includes(category)) return [...prev, category];
                return prev;
            });
        }

        setSavedDishes(prev => {
            const index = prev.findIndex(d => (d.dish_name || d.name) === name);

            const newDish = {
                ...dish,
                dish_name: name,
                category: category,
                _id: index >= 0 ? prev[index]._id : generateId(),
                _savedAt: Date.now()
            };

            if (index >= 0) {
                const newArr = [...prev];
                newArr[index] = newDish;
                return newArr;
            }
            return [...prev, newDish];
        });
    }, []);

    /** Save multiple dishes at once */
    const saveDishes = useCallback((dishes) => {
        // Collect new categories
        const newCategories = new Set();
        dishes.forEach(d => {
            if (d.category && d.category !== '未分类') {
                newCategories.add(d.category);
            }
        });

        if (newCategories.size > 0) {
            setCategories(prev => {
                const toAdd = Array.from(newCategories).filter(c => !prev.includes(c));
                if (toAdd.length === 0) return prev;
                return [...prev, ...toAdd];
            });
        }

        setSavedDishes(prev => {
            const newDishes = [];
            const existingNames = new Set(prev.map(d => d.dish_name || d.name));

            for (const dish of dishes) {
                const name = dish.dish_name || dish.name || '未命名菜谱';
                if (!existingNames.has(name) && !newDishes.some(d => d.dish_name === name)) {
                    newDishes.push({
                        ...dish,
                        dish_name: name,
                        category: dish.category || '未分类',
                        _id: generateId(),
                        _savedAt: Date.now()
                    });
                }
            }
            if (newDishes.length === 0) return prev;
            return [...prev, ...newDishes];
        });
    }, []);

    /** Remove a saved dish by _id */
    const removeDish = useCallback((id) => {
        setSavedDishes(prev => prev.filter(d => d._id !== id));
        setQueue(prev => prev.filter(qid => qid !== id));
    }, []);

    /** Clear all saved dishes */
    const clearAll = useCallback(() => {
        setSavedDishes([]);
        setQueue([]);
    }, []);

    /** Toggle a dish in the cooking queue */
    const toggleQueue = useCallback((id) => {
        setQueue(prev =>
            prev.includes(id) ? prev.filter(qid => qid !== id) : [...prev, id]
        );
    }, []);

    /** Select all saved dishes into queue */
    const selectAll = useCallback(() => {
        setQueue(savedDishes.map(d => d._id));
    }, [savedDishes]);

    /** Clear queue selection */
    const clearQueue = useCallback(() => {
        setQueue([]);
    }, []);

    /** Get dishes currently in queue */
    const queueDishes = savedDishes.filter(d => queue.includes(d._id));

    /** Check if a dish name is already saved */
    const isDishSaved = useCallback((name) => {
        if (!name) return false;
        return savedDishes.some(d => (d.dish_name || d.name) === name);
    }, [savedDishes]);

    /** Add a new category */
    const addCategory = useCallback((name) => {
        setCategories(prev => {
            if (prev.includes(name)) return prev;
            return [...prev, name];
        });
    }, []);

    /** Delete a category */
    const deleteCategory = useCallback((name) => {
        setCategories(prev => prev.filter(c => c !== name));
        // Reset dishes with this category to Uncategorized
        setSavedDishes(prev => prev.map(d =>
            d.category === name ? { ...d, category: '未分类' } : d
        ));
    }, []);

    /** Update a dish's category */
    const updateDishCategory = useCallback((dishId, newCategory) => {
        setSavedDishes(prev => prev.map(d =>
            d._id === dishId ? { ...d, category: newCategory } : d
        ));
    }, []);

    /** 整库替换（用于"整库替换"式导入或还原） */
    const replaceAll = useCallback((dishes, cats) => {
        setSavedDishes(dishes.map(d => ({
            ...d,
            _id: d._id || generateId(),
            _savedAt: d._savedAt || Date.now(),
        })));
        if (Array.isArray(cats) && cats.length) setCategories(cats);
    }, []);

    /** 应用合并后的菜库（冲突已由调用方解决） */
    const importLibrary = useCallback((mergedDishes, cats) => {
        setSavedDishes(mergedDishes.map(d => ({
            ...d,
            _id: d._id || generateId(),
            _savedAt: d._savedAt || Date.now(),
        })));
        if (Array.isArray(cats) && cats.length) {
            setCategories(prev => Array.from(new Set([...prev, ...cats])));
        }
    }, []);

    /** 导出当前整库快照 */
    const exportData = useCallback(() => ({
        dishes: savedDishes,
        categories,
    }), [savedDishes, categories]);

    return {
        savedDishes,
        queue,
        queueDishes,
        categories,
        syncState,
        replaceAll,
        importLibrary,
        exportData,
        saveDish,
        saveDishes,
        removeDish,
        clearAll,
        toggleQueue,
        selectAll,
        clearQueue,
        isDishSaved,
        addCategory,
        deleteCategory,
        updateDishCategory,
    };
}
