/**
 * [IN]: react, framer-motion, react-i18next, lucide-react(Plus/Trash2/ChevronDown), dishDraft(emptyIngredient/normalizeDishDraft)
 * [OUT]: DishEditor — 编辑一道菜（菜名/分类/含单位食材/步骤）的共享表单
 * [POS]: 被 ResultsView 与 CookingQueue 复用；onSave 收到规整后的菜对象
 * [PROTOCOL]: 变更字段集时同步更新本头部、dishDraft、相关消费方与设计文档
 *
 * 注：CustomSelect 与 CAT_COLORS 当前在 ResultsView.jsx 内联定义且未导出，
 * 为保持外观一致且不改动 ResultsView，这里按相同实现复刻。后续应抽到共享模块。
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { emptyIngredient, normalizeDishDraft } from '../utils/dishDraft.js';

const inputStyle = { padding: '0.4rem', border: '2px solid var(--color-ink)', borderRadius: '4px' };

// 与 ResultsView.jsx 保持一致的分类配色
const CAT_COLORS = {
    '主料': { bg: 'var(--color-rose)', border: 'var(--color-rose-border)' },
    '蔬菜': { bg: 'var(--color-mint)', border: 'var(--color-mint-border)' },
    '调料': { bg: 'var(--color-peach)', border: 'var(--color-peach-border)' },
    '香料': { bg: 'var(--color-lavender)', border: 'var(--color-lavender-border)' },
    '液体': { bg: 'var(--color-blue)', border: 'var(--color-blue-border)' },
    '其他': { bg: 'var(--color-paper)', border: 'var(--color-ink)' },
};

// 与 ResultsView.jsx 保持一致的下拉选择器
const CustomSelect = ({ value, onChange, options }) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    return (
        <div style={{ position: 'relative', width: '90px' }}>
            <div
                onClick={() => setOpen(!open)}
                style={{
                    padding: '0.4rem', border: '2px solid var(--color-ink)', borderRadius: '4px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', background: 'var(--color-white)', color: 'var(--color-ink)',
                    fontSize: '0.9rem',
                }}
            >
                {t(`ingCategories.${value}`, value)} <ChevronDown size={14} />
            </div>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{
                            position: 'absolute', top: '100%', left: 0, width: '100%',
                            background: 'var(--color-white)', border: '2px solid var(--color-ink)',
                            borderRadius: '4px', zIndex: 10, marginTop: '2px',
                            boxShadow: '2px 2px 0 var(--color-ink)', overflow: 'hidden',
                        }}
                    >
                        {options.map(opt => (
                            <div
                                key={opt}
                                onClick={() => { onChange(opt); setOpen(false); }}
                                style={{
                                    padding: '0.4rem', cursor: 'pointer',
                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                    background: value === opt ? 'rgba(0,0,0,0.05)' : 'white',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {t(`ingCategories.${opt}`, opt)}
                            </div>
                        ))}
                    </motion.div>
                </>
            )}
        </div>
    );
};

const removeBtnStyle = {
    background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: '0.2rem',
};

const addBtnStyle = {
    marginTop: '0.5rem', background: 'none', border: '2px dashed var(--color-ink-muted)',
    padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
};

const labelStyle = { display: 'flex', flexDirection: 'column', gap: '0.3rem' };

function IngredientRow({ ing, onChange, onRemove }) {
    const set = (field, val) => onChange({ ...ing, [field]: val });
    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="text" value={ing.name} placeholder="食材名" style={{ ...inputStyle, flex: 1 }}
                onChange={e => set('name', e.target.value)} />
            <input type="text" value={ing.amount} placeholder="数量" style={{ ...inputStyle, width: '70px' }}
                onChange={e => set('amount', e.target.value)} />
            <input type="text" value={ing.unit} placeholder="单位" style={{ ...inputStyle, width: '60px' }}
                onChange={e => set('unit', e.target.value)} />
            <CustomSelect value={ing.category} onChange={val => set('category', val)} options={Object.keys(CAT_COLORS)} />
            <button onClick={onRemove} style={removeBtnStyle}>
                <Trash2 size={18} />
            </button>
        </div>
    );
}

function StepRow({ value, index, onChange, onRemove }) {
    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 'bold', paddingTop: '0.5rem' }}>{index + 1}.</span>
            <textarea value={value} rows={2} style={{ ...inputStyle, flex: 1, resize: 'vertical' }}
                onChange={e => onChange(e.target.value)} />
            <button onClick={onRemove} style={removeBtnStyle}>
                <Trash2 size={18} />
            </button>
        </div>
    );
}

function mapIngredient(i) {
    return { name: i.name || '', amount: i.amount ?? '', unit: i.unit ?? '', category: i.category || '主料' };
}

export default function DishEditor({ dish, categories, onSave, onCancel }) {
    const [name, setName] = useState(dish.dish_name || dish.name || '');
    const [category, setCategory] = useState(dish.category || '未分类');
    const [ingredients, setIngredients] = useState((dish.ingredients || []).map(mapIngredient));
    const [steps, setSteps] = useState([...(dish.steps || [])]);

    const setIng = (idx, val) => setIngredients(prev => prev.map((x, i) => (i === idx ? val : x)));
    const setStep = (idx, val) => setSteps(prev => prev.map((x, i) => (i === idx ? val : x)));
    const removeIng = idx => setIngredients(prev => prev.filter((_, i) => i !== idx));
    const removeStep = idx => setSteps(prev => prev.filter((_, i) => i !== idx));

    const handleSave = () => {
        const normalized = normalizeDishDraft(
            { ...dish, dish_name: name, category, ingredients, steps },
            dish.dish_name || dish.name
        );
        onSave(normalized);
    };

    const cats = categories || [];
    return (
        <div className="dish-editor" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onClick={e => e.stopPropagation()}>
            <label style={labelStyle}>
                <span>菜名</span>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </label>
            <label style={labelStyle}>
                <span>分类</span>
                <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                    {!cats.includes(category) && <option value={category}>{category}</option>}
                </select>
            </label>

            <div>
                <h5 style={{ margin: '0 0 0.5rem' }}>食材</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {ingredients.map((ing, i) => (
                        <IngredientRow key={i} ing={ing} onChange={v => setIng(i, v)} onRemove={() => removeIng(i)} />
                    ))}
                </div>
                <button onClick={() => setIngredients(prev => [...prev, emptyIngredient()])} style={addBtnStyle}>
                    <Plus size={16} /> 添加食材
                </button>
            </div>

            <div>
                <h5 style={{ margin: '0 0 0.5rem' }}>步骤</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {steps.map((s, i) => (
                        <StepRow key={i} value={s} index={i} onChange={v => setStep(i, v)} onRemove={() => removeStep(i)} />
                    ))}
                </div>
                <button onClick={() => setSteps(prev => [...prev, ''])} style={addBtnStyle}>
                    <Plus size={16} /> 添加步骤
                </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn-secondary" onClick={onCancel}>取消</button>
                <button className="btn-primary" onClick={handleSave}>保存</button>
            </div>
        </div>
    );
}
