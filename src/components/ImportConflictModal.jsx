/**
 * [IN]: react；props: conflicts, onResolve, onCancel
 * [OUT]: ImportConflictModal — 逐个解决导入重名/相似冲突
 * [POS]: 被 CookingQueue 在导入时挂载
 * [PROTOCOL]: 变更冲突数据结构时同步 recipeBackup.mergeLibrary 与设计文档
 */
import React, { useState } from 'react';

const CHOICES = {
    KEEP_CURRENT: 'keep_current',
    USE_INCOMING: 'use_incoming',
    KEEP_BOTH: 'keep_both',
};

export default function ImportConflictModal({ conflicts, onResolve, onCancel }) {
    const [choices, setChoices] = useState(() => conflicts.map(() => CHOICES.KEEP_CURRENT));

    const setChoice = (idx, val) => {
        setChoices(prev => prev.map((c, i) => (i === idx ? val : c)));
    };

    const name = (d) => d.dish_name || d.name || '未命名';

    const submit = () => {
        onResolve(conflicts.map((c, i) => ({ conflict: c, choice: choices[i] })));
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass-card" style={{ maxWidth: 560, width: '90%', maxHeight: '80vh', overflow: 'auto', padding: '1.5rem' }}>
                <h3>导入冲突（{conflicts.length}）</h3>
                <p style={{ fontSize: '0.95rem', opacity: 0.8 }}>以下菜名重复或高度相似，请逐个选择保留方式：</p>
                {conflicts.map((c, i) => (
                    <div key={i} style={{ borderTop: '1px solid var(--color-border, #ddd)', padding: '0.8rem 0' }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            现有：{name(c.current)} ↔ 导入：{name(c.incoming)}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <label><input type="radio" name={`c${i}`} checked={choices[i] === CHOICES.KEEP_CURRENT} onChange={() => setChoice(i, CHOICES.KEEP_CURRENT)} /> 保留现有</label>
                            <label><input type="radio" name={`c${i}`} checked={choices[i] === CHOICES.USE_INCOMING} onChange={() => setChoice(i, CHOICES.USE_INCOMING)} /> 用导入的</label>
                            <label><input type="radio" name={`c${i}`} checked={choices[i] === CHOICES.KEEP_BOTH} onChange={() => setChoice(i, CHOICES.KEEP_BOTH)} /> 两个都留</label>
                        </div>
                    </div>
                ))}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button className="btn-secondary" onClick={onCancel}>取消</button>
                    <button className="btn-primary" onClick={submit}>应用</button>
                </div>
            </div>
        </div>
    );
}

export { CHOICES };
