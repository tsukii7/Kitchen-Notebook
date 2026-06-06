/**
 * [IN]: react, recipeBackup(parseBackup/mergeLibrary), ImportConflictModal(CHOICES)
 * [OUT]: useImportBackup() — 备份导入流程：解析、合并、冲突解决
 * [POS]: 被 CookingQueue 消费
 * [PROTOCOL]: 变更冲突数据结构时同步 recipeBackup.mergeLibrary、ImportConflictModal、设计文档
 */
import { useState, useRef, useCallback } from 'react';
import { parseBackup, mergeLibrary } from '../utils/recipeBackup.js';
import { CHOICES } from '../components/ImportConflictModal.jsx';

const dishName = (d) => d.dish_name || d.name || '';

function applyOneResolution(list, conflict, choice) {
    if (choice === CHOICES.USE_INCOMING) {
        return list.map(d => (dishName(d) === dishName(conflict.current) ? conflict.incoming : d));
    }
    if (choice === CHOICES.KEEP_BOTH) {
        return [...list, { ...conflict.incoming, dish_name: dishName(conflict.incoming) + '（导入）' }];
    }
    return list;
}

export function useImportBackup({ savedDishes, importLibrary, addToast }) {
    const [conflictState, setConflictState] = useState(null);
    const fileInputRef = useRef(null);

    const handleImportFile = useCallback(async (file) => {
        if (!file) return;
        let parsed;
        try {
            parsed = parseBackup(await file.text());
        } catch (err) {
            addToast('导入失败：' + err.message, 'error');
            return;
        }
        const { merged, conflicts } = mergeLibrary(savedDishes, parsed.dishes);
        if (conflicts.length === 0) {
            importLibrary(merged, parsed.categories);
            addToast(`已导入，新增 ${merged.length - savedDishes.length} 道菜`, 'success');
        } else {
            setConflictState({ base: merged, conflicts, cats: parsed.categories });
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [savedDishes, importLibrary, addToast]);

    const applyResolutions = useCallback((resolutions) => {
        let result = [...conflictState.base];
        for (const { conflict, choice } of resolutions) {
            result = applyOneResolution(result, conflict, choice);
        }
        const added = result.length - savedDishes.length;
        importLibrary(result, conflictState.cats);
        addToast(`导入完成，新增 ${added} 道菜`, 'success');
        setConflictState(null);
    }, [conflictState, savedDishes, importLibrary, addToast]);

    const cancelConflicts = useCallback(() => setConflictState(null), []);

    return { conflictState, fileInputRef, handleImportFile, applyResolutions, cancelConflicts };
}
