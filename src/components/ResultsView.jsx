import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, ShoppingCart, UtensilsCrossed, ChevronDown, Save, Check, Download, Copy, RotateCcw, FileText, AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../utils/ingredientNormalizer';
import { useWobbly } from '../hooks/useWobbly';

const CustomSelect = ({ value, onChange, options }) => {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    return (
        <div style={{ position: 'relative', width: '90px' }}>
            <div
                onClick={() => setOpen(!open)}
                style={{
                    padding: '0.4rem', border: '2px solid var(--color-ink)', borderRadius: '4px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', background: 'var(--color-white)', color: 'var(--color-ink)',
                    fontSize: '0.9rem'
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
                            boxShadow: '2px 2px 0 var(--color-ink)', overflow: 'hidden'
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
                                    fontSize: '0.9rem'
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

const ALL_CATEGORIES = ['全部', ...Object.keys(CATEGORIES), '其他'];

// Vibrant notebook colors
const COLOR_PALETTE = [
    { bg: 'var(--color-postit)', border: 'var(--color-ink)' },
    { bg: 'var(--color-mint)', border: 'var(--color-mint-border)' },
    { bg: 'var(--color-rose)', border: 'var(--color-rose-border)' },
    { bg: 'var(--color-blue)', border: 'var(--color-blue-border)' },
    { bg: 'var(--color-lavender)', border: 'var(--color-lavender-border)' },
    { bg: 'var(--color-peach)', border: 'var(--color-peach-border)' },
];

const CAT_COLORS = {
    '主料': { bg: 'var(--color-rose)', border: 'var(--color-rose-border)' },
    '蔬菜': { bg: 'var(--color-mint)', border: 'var(--color-mint-border)' },
    '调料': { bg: 'var(--color-peach)', border: 'var(--color-peach-border)' },
    '香料': { bg: 'var(--color-lavender)', border: 'var(--color-lavender-border)' },
    '液体': { bg: 'var(--color-blue)', border: 'var(--color-blue-border)' },
    '其他': { bg: 'var(--color-paper)', border: 'var(--color-ink)' }
};

function ResultsView({ dishes, shoppingList, rawText, onReset, onExportJSON, onExportMarkdown, onSaveDish, onUpdateDish, onSaveAll, isDishSaved }) {
    const { t } = useTranslation();
    const [activeCategory, setActiveCategory] = useState('全部');
    const [expandedDishes, setExpandedDishes] = useState(() => new Set(dishes.map((_, i) => i)));
    const [editModeDishIdx, setEditModeDishIdx] = useState(null);
    const [draftIngredients, setDraftIngredients] = useState([]);

    const resultBlockWobble = useWobbly({ min: 2, max: 4 });
    const pillWobble = useWobbly({ min: 5, max: 15 });

    const getRandomWobble = () => {
        const r = () => Math.floor(Math.random() * 4 + 2);
        return `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
    };

    const getDiskColor = (name) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
    };

    const filteredList = activeCategory === '全部'
        ? shoppingList
        : shoppingList.filter(item => item.category === activeCategory);

    const toggleDish = useCallback((idx) => {
        setExpandedDishes(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }, []);

    return (
        <section className="results-section">
            <div className="results-header">
                <h2 className="section-title" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
                    <span className="section-icon"><ClipboardList size={24} strokeWidth={2.5} /></span>
                    {t('results.title')}
                </h2>
                <div className="export-bar">
                    <button className="btn-export btn-save-all" onClick={() => onSaveAll?.(dishes)}>
                        <Save size={16} strokeWidth={2.5} /> {t('results.saveAll')}
                    </button>
                    <button className="btn-export" onClick={onExportJSON}>
                        <Download size={16} strokeWidth={2.5} /> JSON
                    </button>
                    <button className="btn-export" onClick={onExportMarkdown}>
                        <Copy size={16} strokeWidth={2.5} /> Markdown
                    </button>
                    <button className="btn-secondary" onClick={onReset}>
                        <RotateCcw size={16} strokeWidth={2.5} /> {t('results.startOver')}
                    </button>
                </div>
            </div>

            <div className="results-layout">
                {/* Left: Shopping List */}
                <div className="results-left">
                    <div className="glass-card result-block" style={resultBlockWobble}>
                        <div style={{
                            position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%) rotate(2deg)',
                            width: '120px', height: '35px', background: 'rgba(255,255,255,0.4)',
                            border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            pointerEvents: 'none'
                        }} />

                        <div className="result-header" style={{ borderBottom: '2px dashed var(--color-ink-muted)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <h3><span className="header-icon"><ShoppingCart size={20} strokeWidth={2.5} /></span> {t('results.shoppingList')}</h3>
                            <span className="badge" style={{
                                background: 'var(--color-accent)',
                                color: 'white',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '50% 20% / 10% 40%',
                                transform: 'rotate(-5deg)',
                                display: 'inline-block'
                            }}>{shoppingList.length} {t('results.items')}</span>
                        </div>

                        <div className="category-filters" style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {ALL_CATEGORIES.map(cat => {
                                const count = cat === '全部'
                                    ? shoppingList.length
                                    : shoppingList.filter(i => i.category === cat).length;
                                if (count === 0 && cat !== '全部') return null;

                                const catColor = CAT_COLORS[cat] || CAT_COLORS['其他'];
                                const isActive = activeCategory === cat;

                                return (
                                    <button
                                        key={cat}
                                        className={`filter-pill ${isActive ? 'filter-pill--active' : ''}`}
                                        onClick={() => setActiveCategory(cat)}
                                        style={{
                                            border: `2px solid ${isActive ? catColor.border : 'var(--color-ink)'}`,
                                            background: isActive ? catColor.bg : 'var(--color-white)',
                                            color: 'var(--color-ink)',
                                            padding: '0.3rem 0.8rem',
                                            borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            boxShadow: isActive ? 'none' : '2px 2px 0 var(--color-ink)'
                                        }}
                                    >
                                        {cat === '全部' ? t('categories.all') : t(`ingCategories.${cat}`, cat)}
                                        <span className="filter-count" style={{ opacity: 0.8, fontSize: '0.8em', fontWeight: 'bold' }}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="shopping-list">
                            <AnimatePresence mode="popLayout">
                                {filteredList.map((item, idx) => {
                                    const catStyle = CAT_COLORS[item.category] || CAT_COLORS['其他'];
                                    return (
                                        <motion.div
                                            key={item.name}
                                            className="shopping-item"
                                            layout
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                                            style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px dashed var(--color-ink-light)' }}
                                        >
                                            <div style={{
                                                width: '16px', height: '16px',
                                                border: '2px solid var(--color-ink)',
                                                marginRight: '1rem',
                                                borderRadius: '3px 5px 4px 6px'
                                            }} />

                                            <div className="item-main" style={{ flex: 1 }}>
                                                <span className="item-name" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.name}</span>
                                                {item.renames?.length > 0 && (
                                                    <span className="item-alias" title={`${t('results.originalName')}${item.renames.join(', ')}`} style={{ color: 'var(--color-ink-muted)', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                                                        ({item.renames.join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="item-amount" style={{ fontWeight: 'bold', color: 'var(--color-accent)', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', marginRight: '1rem' }}>{item.amount}</span>
                                            <span className="item-category-tag" style={{
                                                fontSize: '0.8rem',
                                                border: `1px solid ${catStyle.border}`,
                                                padding: '0.1rem 0.5rem',
                                                borderRadius: '4px',
                                                transform: 'rotate(2deg)',
                                                background: catStyle.bg,
                                                color: 'var(--color-ink)'
                                            }}>{t(`ingCategories.${item.category}`, item.category)}</span>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            {filteredList.length === 0 && (
                                <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                                    {t('results.emptyList')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Dish Cards */}
                <div className="results-right">
                    <div className="result-header" style={{ marginBottom: '1rem' }}>
                        <h3><span className="header-icon"><UtensilsCrossed size={20} strokeWidth={2.5} /></span> {t('results.dishDetails')}</h3>
                        <span className="badge" style={{
                            background: 'var(--color-secondary)',
                            color: 'white',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '40% 60% 50% 50% / 50%',
                            transform: 'rotate(3deg)',
                            display: 'inline-block',
                            marginLeft: '0.5rem'
                        }}>{dishes.length} {t('results.dishes')}</span>
                    </div>

                    <div className="dishes-grid" style={{ display: 'grid', gap: '1.5rem' }}>
                        {dishes.map((dish, idx) => {
                            const color = getDiskColor(dish.dish_name || dish.name);
                            return (
                                <motion.div
                                    key={idx}
                                    className="dish-card glass-card"
                                    initial={{ opacity: 0, y: 20, rotate: idx % 2 === 0 ? -1 : 1 }}
                                    animate={{ opacity: 1, y: 0, rotate: idx % 2 === 0 ? -1 : 1 }}
                                    transition={{ delay: idx * 0.1, duration: 0.3 }}
                                    style={{
                                        background: color.bg,
                                        border: `2px solid ${color.border}`,
                                        borderRadius: getRandomWobble(),
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
                                        width: '16px', height: '16px', borderRadius: '50%',
                                        background: 'var(--color-accent)',
                                        border: '2px solid var(--color-ink)',
                                        boxShadow: '1px 2px 2px rgba(0,0,0,0.2)'
                                    }} />

                                    <div className="dish-card-header" onClick={() => toggleDish(idx)} style={{ display: 'flex', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: `2px dashed ${color.border}`, cursor: 'pointer' }}>
                                        <span className="dish-number" style={{
                                            width: '28px', height: '28px',
                                            background: 'var(--color-ink)', color: 'var(--color-white)',
                                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', marginRight: '0.8rem'
                                        }}>{idx + 1}</span>
                                        <h4 style={{ flex: 1, margin: 0, fontSize: '1.4rem' }}>{dish.dish_name || dish.name}</h4>

                                        <button
                                            className="btn-icon"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const dishName = dish.dish_name || dish.name;
                                                if (!isDishSaved(dishName)) {
                                                    onSaveDish(dish);
                                                }
                                            }}
                                            style={{
                                                marginRight: '10px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: isDishSaved(dish.dish_name || dish.name) ? 'default' : 'pointer',
                                                color: isDishSaved(dish.dish_name || dish.name) ? 'var(--color-success)' : 'var(--color-ink)'
                                            }}
                                            title={isDishSaved(dish.dish_name || dish.name) ? t('results.saved') : t('results.saveToQueue')}
                                        >
                                            {isDishSaved(dish.dish_name || dish.name) ? <Check size={20} /> : <Save size={20} />}
                                        </button>

                                        <span className={`chevron ${expandedDishes.has(idx) ? 'chevron--open' : ''}`} style={{ transition: 'transform 0.2s' }}>
                                            <ChevronDown size={20} strokeWidth={2.5} />
                                        </span>
                                    </div>

                                    <AnimatePresence initial={false}>
                                        {expandedDishes.has(idx) && (
                                            <motion.div
                                                className="dish-card-body"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                style={{ overflow: 'hidden', paddingTop: '1rem' }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <h5 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>{t('results.ingredients')}</h5>
                                                    {editModeDishIdx !== idx && (
                                                        <button
                                                            className="btn-icon"
                                                            onClick={(e) => { e.stopPropagation(); setEditModeDishIdx(idx); setDraftIngredients([...(dish.ingredients || [])]); }}
                                                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--color-white)', border: '2px solid var(--color-ink)', borderRadius: '4px', cursor: 'pointer', boxShadow: '1px 1px 0 var(--color-ink)' }}
                                                        >
                                                            <Pencil size={14} /> {t('results.editIngredients')}
                                                        </button>
                                                    )}
                                                </div>

                                                {editModeDishIdx === idx ? (
                                                    <div className="dish-ingredients-edit" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '8px', border: `2px dashed ${color.border}` }} onClick={e => e.stopPropagation()}>
                                                        {draftIngredients.map((ing, i) => (
                                                            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                <input
                                                                    type="text"
                                                                    value={ing.name}
                                                                    onChange={e => {
                                                                        const newDraft = [...draftIngredients];
                                                                        newDraft[i].name = e.target.value;
                                                                        setDraftIngredients(newDraft);
                                                                    }}
                                                                    placeholder={t('results.ingredientName')}
                                                                    style={{ flex: 1, padding: '0.4rem', border: '2px solid var(--color-ink)', borderRadius: '4px' }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={ing.amount}
                                                                    onChange={e => {
                                                                        const newDraft = [...draftIngredients];
                                                                        newDraft[i].amount = e.target.value;
                                                                        setDraftIngredients(newDraft);
                                                                    }}
                                                                    placeholder={t('results.ingredientAmount')}
                                                                    style={{ width: '80px', padding: '0.4rem', border: '2px solid var(--color-ink)', borderRadius: '4px' }}
                                                                />
                                                                <CustomSelect
                                                                    value={ing.category}
                                                                    onChange={val => {
                                                                        const newDraft = [...draftIngredients];
                                                                        newDraft[i].category = val;
                                                                        setDraftIngredients(newDraft);
                                                                    }}
                                                                    options={Object.keys(CAT_COLORS)}
                                                                />
                                                                <button onClick={() => setDraftIngredients(draftIngredients.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: '0.2rem' }}>
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                                                            <button
                                                                onClick={() => setDraftIngredients([...draftIngredients, { name: '', amount: '', category: '主料' }])}
                                                                style={{ background: 'none', border: '2px dashed var(--color-ink-muted)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--color-ink)' }}
                                                            >
                                                                <Plus size={16} /> {t('results.addRow')}
                                                            </button>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={() => setEditModeDishIdx(null)}
                                                                    style={{ background: 'var(--color-white)', border: '2px solid var(--color-ink)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '1px 1px 0 var(--color-ink)' }}
                                                                >{t('results.cancel')}</button>
                                                                <button
                                                                    onClick={() => {
                                                                        const finalIngredients = draftIngredients.filter(ing => ing.name.trim());
                                                                        onUpdateDish(idx, { ...dish, ingredients: finalIngredients });
                                                                        setEditModeDishIdx(null);
                                                                    }}
                                                                    style={{ background: 'var(--color-secondary)', color: 'white', border: '2px solid var(--color-ink)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '1px 1px 0 var(--color-ink)' }}
                                                                >{t('results.confirm')}</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="dish-ingredients" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                        {(dish.ingredients || []).length > 0 ? dish.ingredients.map((ing, i) => {
                                                            const cat = ing.category ? CAT_COLORS[ing.category] : null;
                                                            return (
                                                                <span key={i} className="ingredient-tag" style={{
                                                                    background: cat ? cat.bg : 'rgba(255,255,255,0.5)',
                                                                    border: `1px solid ${cat ? cat.border : color.border}`,
                                                                    padding: '0.2rem 0.6rem',
                                                                    borderRadius: '255px 15px 255px 15px / 15px 225px 15px 255px'
                                                                }}>
                                                                    {ing.name} <strong style={{ color: 'var(--color-ink)' }}>{ing.amount}</strong>
                                                                </span>
                                                            );
                                                        }) : (
                                                            <span className="ingredient-tag muted" style={{ fontStyle: 'italic', color: 'var(--color-ink-muted)' }}>{t('results.noIngredients')}</span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="dish-steps" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    {(dish.steps || []).map((step, si) => (
                                                        <div key={si} className="step-item" style={{ display: 'flex', gap: '0.8rem' }}>
                                                            <span className="step-num" style={{ fontWeight: 'bold', color: color.border }}>{si + 1}.</span>
                                                            <span className="step-text" style={{ flex: 1 }}>{step}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <details className="raw-text-block glass-card" style={{ marginTop: '2rem', padding: '1rem', ...resultBlockWobble }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={20} strokeWidth={2.5} />
                    {t('results.rawText')}
                </summary>
                <div className="raw-text-content" style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '5px', fontFamily: 'monospace' }}>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{rawText}</pre>
                </div>
            </details>
        </section>
    );
}

export default ResultsView;
