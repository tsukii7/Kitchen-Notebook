import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { mergeIngredients, CATEGORIES } from '../utils/ingredientNormalizer';
import { UtensilsCrossed, Trash2, Maximize2, X, Download, Share2, CornerDownRight, ExternalLink, ChevronDown, AlertTriangle, ShoppingCart, Inbox, Loader2, Camera } from 'lucide-react';
import { useWobbly } from '../hooks/useWobbly';
import { useTranslation } from 'react-i18next';

// Align with ResultsView colors
const CAT_COLORS = {
    '主料': { bg: 'var(--color-rose)', border: 'var(--color-rose-border)' },
    '蔬菜': { bg: 'var(--color-mint)', border: 'var(--color-mint-border)' },
    '调料': { bg: 'var(--color-peach)', border: 'var(--color-peach-border)' },
    '香料': { bg: 'var(--color-lavender)', border: 'var(--color-lavender-border)' },
    '液体': { bg: 'var(--color-blue)', border: 'var(--color-blue-border)' },
    '其他': { bg: 'var(--color-paper)', border: 'var(--color-ink)' }
};

// Simplified CategoryDropdown - Select Only
function CategoryDropdown({ selected, options, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const { t } = useTranslation();

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="custom-dropdown-container" ref={dropdownRef}>
            <button
                className="custom-dropdown-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected === '未分类' ? t('dishCategories.未分类') : t(`dishCategories.${selected}`, selected)}
                <ChevronDown size={14} style={{ marginLeft: '4px', opacity: 0.6 }} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="custom-dropdown-menu"
                    >
                        <div className="dropdown-scroll-area">
                            <div
                                className={`dropdown-item ${selected === '未分类' ? 'selected' : ''}`}
                                onClick={() => { onSelect('未分类'); setIsOpen(false); }}
                            >
                                {t('dishCategories.未分类')}
                            </div>
                            {options.map(opt => (
                                <div
                                    key={opt}
                                    className={`dropdown-item ${selected === opt ? 'selected' : ''}`}
                                    onClick={() => { onSelect(opt); setIsOpen(false); }}
                                >
                                    {t(`dishCategories.${opt}`, opt)}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CookingQueue({
    savedDishes,
    queue,
    queueDishes,
    categories,
    toggleQueue,
    removeDish,
    clearAll,
    selectAll,
    clearQueue,
    addCategory,
    deleteCategory,
    updateDishCategory,
    addToast,
}) {
    const { t } = useTranslation();
    const [showMerged, setShowMerged] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [activeDish, setActiveDish] = useState(null);
    const [activeCategory, setActiveCategory] = useState('全部');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(null);
    const exportRef = useRef(null);

    // Auto-expand newly added dishes (within last 2 seconds)
    React.useEffect(() => {
        const now = Date.now();
        const recent = savedDishes.find(d => now - (d._savedAt || 0) < 2000);
        if (recent) {
            setActiveDish(recent);
        }
    }, [savedDishes]);

    // Wobbly styles
    const queueCardWobble = useWobbly({ min: 3, max: 8 });
    const modalWobble = useWobbly({ min: 5, max: 10 });
    const catInputWobble = useWobbly({ min: 2, max: 4 });

    const mergedList = useMemo(() => {
        if (queueDishes.length === 0) return [];
        return mergeIngredients(queueDishes);
    }, [queueDishes]);

    const filteredDishes = useMemo(() => {
        if (activeCategory === '全部') return savedDishes;
        return savedDishes.filter(d => d.category === activeCategory);
    }, [savedDishes, activeCategory]);

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;
        addCategory(newCategoryName.trim());
        setNewCategoryName('');
        setIsAddingCategory(false);
        addToast(t('queue.addCategorySuccess'), 'success');
    };

    const handleExportImage = useCallback(async () => {
        if (!exportRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: '#ffffff', // Paper white for export
                scale: 2,
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `采购清单_${queueDishes.map(d => d.dish_name).join('+')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            addToast?.(t('queue.exportSuccess'), 'success');
        } catch (err) {
            console.error('Export error:', err);
            addToast?.(t('queue.exportFailed') + ': ' + err.message, 'error');
        } finally {
            setExporting(false);
        }
    }, [queueDishes, addToast]);

    const confirmClearAll = useCallback(() => {
        clearAll();
        setShowClearConfirm(false);
    }, [clearAll]);

    if (savedDishes.length === 0) {
        return (
            <div className="queue-section">
                <div className="queue-empty glass-card" style={{ borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px' }}>
                    <div className="queue-empty-icon" style={{ marginBottom: '0.5rem', color: 'var(--color-ink-muted)' }}>
                        <Inbox size={48} strokeWidth={1.5} />
                    </div>
                    <h3>{t('queue.noDishes')}</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="queue-section">
            <div className="queue-header" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="queue-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.4rem', margin: 0 }}>
                        <UtensilsCrossed size={22} strokeWidth={2.5} />
                        {t('queue.title')}
                        <span className="queue-badge" style={{
                            background: 'var(--color-accent)',
                            color: 'white',
                            padding: '0.1rem 0.6rem',
                            borderRadius: '50% 40% 60% 50%',
                            fontSize: '0.9rem',
                            transform: 'rotate(-3deg)'
                        }}>{savedDishes.length}</span>
                    </h3>
                    <div className="queue-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-sm queue-btn" onClick={selectAll} style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{t('queue.selectAll')}</button>
                        <button className="btn-sm queue-btn" onClick={clearQueue} style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{t('queue.clearSelection')}</button>
                        <button className="btn-sm queue-btn btn-danger" onClick={() => setShowClearConfirm(true)} style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>{t('queue.clearAll')}</button>
                    </div>
                </div>

                {/* Category Bar */}
                <div className="category-bar" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', alignItems: 'center' }}>
                    <button
                        className={`category-pill ${activeCategory === '全部' ? 'active' : ''}`}
                        onClick={() => setActiveCategory('全部')}
                    >
                        {t('categories.all')}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                            style={{ paddingRight: '0.6rem' }}
                        >
                            {t(`dishCategories.${cat}`, cat)}
                            <span
                                className="pill-delete-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteCategory(cat);
                                }}
                                title={t('queue.deleteCategory')}
                            >
                                <X size={12} strokeWidth={3} />
                            </span>
                        </button>
                    ))}

                    {isAddingCategory ? (
                        <div className="category-input-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <input
                                autoFocus
                                type="text"
                                className="category-input"
                                placeholder={t('queue.newCategory')}
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleAddCategory();
                                    if (e.key === 'Escape') setIsAddingCategory(false);
                                }}
                                onBlur={() => setIsAddingCategory(false)}
                                style={{ width: '80px', padding: '0.2rem 0.5rem', borderRadius: '15px', border: '2px solid var(--color-ink)', ...catInputWobble }}
                            />
                        </div>
                    ) : (
                        <button className="category-pill category-add" onClick={() => setIsAddingCategory(true)}>
                            +
                        </button>
                    )}
                </div>
            </div>

            <div className="queue-grid">
                <AnimatePresence mode="popLayout">
                    {filteredDishes.map((dish, i) => {
                        const inQueue = queue.includes(dish._id);
                        return (
                            <motion.div
                                key={dish._id}
                                className={`queue-card glass-card ${inQueue ? 'queue-card--selected' : ''}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    padding: '1rem',
                                    borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                                    background: inQueue ? 'var(--color-postit)' : 'var(--color-white)',
                                    border: inQueue ? '3px solid var(--color-ink)' : '2px solid var(--color-ink)',
                                    transform: inQueue ? 'scale(1.02)' : 'none',
                                    cursor: 'default',
                                    position: 'relative'
                                }}
                            >
                                {/* Tape effect */}
                                <div style={{
                                    position: 'absolute', top: '-8px', left: '50%', transform: `translateX(-50%) rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                                    width: '60px', height: '20px', background: 'rgba(255,255,255,0.5)',
                                    border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    pointerEvents: 'none'
                                }} />

                                <div className="queue-card-header"
                                    onClick={() => setActiveDish(dish)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                                        <label className="queue-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={inQueue}
                                                onChange={() => toggleQueue(dish._id)}
                                                className="queue-checkbox"
                                                style={{ width: '18px', height: '18px', accentColor: 'var(--color-ink)' }}
                                            />
                                            <span className="queue-dish-name" style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{dish.dish_name}</span>
                                        </label>

                                        {/* Custom Category Dropdown - Select Only */}
                                        <div onClick={e => e.stopPropagation()} style={{ marginLeft: '28px', position: 'relative' }}>
                                            <CategoryDropdown
                                                selected={dish.category || '未分类'}
                                                options={categories}
                                                onSelect={(cat) => updateDishCategory(dish._id, cat)}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            className="btn-icon-sm btn-danger"
                                            onClick={(e) => { e.stopPropagation(); removeDish(dish._id); }}
                                            title={t('queue.delete')}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-accent)', padding: '2px' }}
                                        >
                                            <Trash2 size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                <div className="queue-card-body" onClick={() => setActiveDish(dish)} style={{ cursor: 'pointer' }}>

                                    <div className="queue-meta" style={{ display: 'flex', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--color-ink-muted)', marginBottom: '0.6rem' }}>
                                        <span>🥬 {dish.ingredients?.length || 0}</span>
                                        <span>⏱️ {dish.steps?.length || 0} {t('results.steps')}</span>
                                    </div>

                                    <div className="queue-ingredients-mini" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                        {(dish.ingredients || []).slice(0, 3).map((ing, i) => {
                                            const catTheme = ing.category && CAT_COLORS[ing.category] ? CAT_COLORS[ing.category] : CAT_COLORS['其他'];
                                            return (
                                                <span key={i} className="ingredient-tag" style={{
                                                    fontSize: '0.75rem',
                                                    background: catTheme.bg,
                                                    border: `1px solid ${catTheme.border}`,
                                                    color: 'var(--color-ink)',
                                                    padding: '1px 5px',
                                                    borderRadius: '3px'
                                                }}>
                                                    {ing.name}
                                                </span>
                                            );
                                        })}
                                        {(dish.ingredients?.length || 0) > 3 && (
                                            <span className="ingredient-tag ingredient-tag--more" style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>...</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Merge Bar - Prevent layout shift with explicit height container or fixed positioning that doesn't conflict */}
            <div style={{ height: '80px' }}></div>
            <AnimatePresence>
                {queue.length > 0 && (
                    <motion.div
                        className="queue-merge-bar glass-card"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={{
                            position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                            width: '90%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.8rem 1.5rem', background: 'var(--color-ink)', color: 'var(--color-white)',
                            borderRadius: '255px 15px 225px 15px / 15px 225px 15px 255px',
                            boxShadow: 'var(--shadow-hard-lg)', zIndex: 50
                        }}
                    >
                        <div className="merge-info">
                            <span className="merge-count" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                                {t('queue.selectedDishes_pre')}<strong>{queue.length}</strong>{t('queue.selectedDishes_post')}
                            </span>
                        </div>
                        <button
                            className="btn-primary btn-merge"
                            onClick={() => setShowMerged(true)}
                            style={{
                                background: 'var(--color-white)',
                                color: 'var(--color-ink)',
                                boxShadow: '3px 3px 0 var(--color-accent)',
                                padding: '0.4rem 1.2rem',
                                fontSize: '1rem'
                            }}
                        >
                            <ShoppingCart size={18} strokeWidth={2.5} /> {t('queue.mergeList')}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showMerged && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMerged(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            className="modal-content glass-card"
                            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '90%', maxWidth: '700px', maxHeight: '85vh', overflowY: 'auto',
                                background: 'var(--color-white)', padding: '0',
                                ...modalWobble, boxShadow: 'var(--shadow-hard-lg)',
                                display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div className="modal-header" style={{
                                padding: '1.5rem',
                                borderBottom: '2px solid var(--color-ink)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'var(--color-paper)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.6rem', transform: 'rotate(-1deg)' }}>{t('queue.mergedTitle')}</h3>
                                <button className="modal-close" onClick={() => setShowMerged(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }}>
                                    <X size={28} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="modal-body" style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                                <div ref={exportRef} className="export-area" style={{ position: 'relative', paddingLeft: '20px' }}>

                                    <div className="export-header" style={{ marginBottom: '1.5rem', borderBottom: '2px dashed var(--color-ink-muted)', paddingBottom: '0.5rem' }}>
                                        <h2 className="export-title" style={{ fontSize: '1.8rem', margin: '0 0 0.5rem 0' }}>{t('queue.shoppingList')}</h2>
                                        <p className="export-subtitle" style={{ fontSize: '1rem', color: 'var(--color-ink-muted)' }}>
                                            {t('queue.includes')}: {queueDishes.map(d => d.dish_name).join(' + ')}
                                        </p>
                                    </div>

                                    <div className="merge-table-container">
                                        {Object.entries(CATEGORIES).map(([catName, _]) => {
                                            const itemsInCat = mergedList.filter(item => item.category === catName);
                                            if (itemsInCat.length === 0) return null;

                                            const catTheme = CAT_COLORS[catName] || CAT_COLORS['其他'];

                                            return (
                                                <div key={catName} className="category-section" style={{ marginBottom: '2rem' }}>
                                                    <h4 style={{
                                                        margin: '0 0 1rem 0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        color: 'var(--color-ink)',
                                                        fontSize: '1.2rem'
                                                    }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '12px',
                                                            height: '12px',
                                                            borderRadius: '50%',
                                                            background: catTheme.bg,
                                                            border: `2px solid ${catTheme.border}`
                                                        }}></span>
                                                        {t(`ingCategories.${catName}`, catName)}
                                                        <span style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)', fontWeight: 'normal' }}>({itemsInCat.length})</span>
                                                    </h4>

                                                    <table className="merge-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '2px solid var(--color-ink)' }}>
                                                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('queue.item')}</th>
                                                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('queue.totalAmount')}</th>
                                                                <th style={{ textAlign: 'left', padding: '0.5rem' }}>{t('queue.source')}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {itemsInCat.map((item, i) => (
                                                                <tr key={i} style={{ borderBottom: '1px dashed var(--color-ink-light)' }}>
                                                                    <td className="cell-name" style={{ padding: '0.8rem 0.5rem' }}>{item.name}</td>
                                                                    <td className="cell-amount" style={{ padding: '0.8rem 0.5rem' }}>{item.amount}</td>
                                                                    <td className="cell-source" style={{ padding: '0.8rem 0.5rem', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>{item.sources?.join(' / ')}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })}

                                        {/* Handle "Other" category separately if not covered (though map handles it if in CATEGORIES) */}
                                        {mergedList.filter(item => !Object.keys(CATEGORIES).includes(item.category)).length > 0 && (
                                            <div className="category-section">
                                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>{t('ingCategories.其他')}</h4>
                                                <table className="merge-table" style={{ width: '100%' }}>
                                                    {/* ... render table for others ... */}
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {mergedList.some(i => i.warning) && (
                                        <div className="merge-warnings" style={{ marginTop: '1.5rem', padding: '0.8rem', border: '2px dashed var(--color-accent)', background: 'rgba(255, 77, 77, 0.05)', borderRadius: '8px' }}>
                                            <p style={{ color: 'var(--color-accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '0.9rem' }}>
                                                <AlertTriangle size={18} strokeWidth={2.5} />
                                                {t('queue.warningUnit')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer" style={{
                                padding: '1rem 2rem',
                                borderTop: '2px solid var(--color-ink)',
                                background: 'var(--color-paper)',
                                display: 'flex', justifyContent: 'flex-end', gap: '1rem'
                            }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleExportImage}
                                    disabled={exporting}
                                    style={{ fontSize: '1rem', padding: '0.5rem 1.2rem' }}
                                >
                                    {exporting
                                        ? <><Loader2 size={18} style={{ animation: 'spin 0.7s linear infinite' }} /> {t('queue.generating')}</>
                                        : <><Camera size={18} strokeWidth={2.5} /> {t('queue.exportImage')}</>
                                    }
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recipe Details Modal */}
            <AnimatePresence>
                {activeDish && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setActiveDish(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            className="modal-content glass-card"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto',
                                background: 'var(--color-white)', padding: '0',
                                ...modalWobble, boxShadow: 'var(--shadow-hard-lg)',
                                display: 'flex', flexDirection: 'column'
                            }}
                        >
                            <div className="modal-header" style={{
                                padding: '1.2rem 1.5rem',
                                borderBottom: '2px dashed var(--color-ink-muted)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'var(--color-paper)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{activeDish.dish_name || activeDish.name}</h3>
                                <button className="modal-close" onClick={() => setActiveDish(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink)' }}>
                                    <X size={24} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                <h4 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.4rem' }}>🥬</span> {t('results.ingredients')}
                                </h4>
                                <div className="dish-ingredients" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                                    {(activeDish.ingredients || []).map((ing, i) => {
                                        const cat = ing.category ? CAT_COLORS[ing.category] : CAT_COLORS['其他'];
                                        return (
                                            <span key={i} className="ingredient-tag" style={{
                                                background: cat ? cat.bg : 'rgba(255,255,255,0.5)',
                                                border: `1px solid ${cat ? cat.border : 'var(--color-ink)'}`,
                                                padding: '0.3rem 0.8rem',
                                                borderRadius: '255px 15px 255px 15px / 15px 225px 15px 255px',
                                                fontSize: '1rem',
                                                display: 'flex', alignItems: 'center', gap: '0.3rem'
                                            }}>
                                                {ing.name} <strong style={{ color: 'var(--color-ink)' }}>{ing.amount}</strong>
                                            </span>
                                        );
                                    })}
                                </div>

                                <h4 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.4rem' }}>🍳</span> {t('results.steps')}
                                </h4>
                                <div className="dish-steps" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {(activeDish.steps || []).map((step, si) => (
                                        <div key={si} className="step-item" style={{ display: 'flex', gap: '1rem', fontSize: '1rem', lineHeight: '1.5' }}>
                                            <span className="step-num" style={{
                                                fontWeight: 'bold', color: 'var(--color-white)',
                                                background: 'var(--color-ink-muted)',
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, fontSize: '0.9rem'
                                            }}>{si + 1}</span>
                                            <span className="step-text" style={{ flex: 1 }}>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear Confirmation Modal */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowClearConfirm(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            className="modal-content glass-card"
                            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '90%', maxWidth: '400px',
                                background: 'var(--color-white)', padding: '2rem',
                                ...modalWobble, boxShadow: 'var(--shadow-hard-lg)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ marginBottom: '1.5rem', color: 'var(--color-accent)' }}>
                                <AlertTriangle size={48} strokeWidth={2} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t('queue.clearAll')}？</h3>
                            <p style={{ color: 'var(--color-ink-muted)', marginBottom: '2rem' }}>
                                您正在删除所有已保存的菜谱，此操作无法撤销。
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setShowClearConfirm(false)}
                                    style={{ padding: '0.5rem 1.5rem' }}
                                >
                                    {t('results.cancel')}
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={confirmClearAll}
                                    style={{ padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: 'white' }}
                                >
                                    {t('queue.clearAll')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Category Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmDeleteCategory && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmDeleteCategory(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <motion.div
                            className="modal-content glass-card"
                            initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '90%', maxWidth: '400px',
                                background: 'var(--color-white)', padding: '2rem',
                                ...modalWobble, boxShadow: 'var(--shadow-hard-lg)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ marginBottom: '1.5rem', color: 'var(--color-accent)' }}>
                                <Trash2 size={48} strokeWidth={2} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t('queue.deleteCategoryTitle')}</h3>
                            <p style={{ color: 'var(--color-ink-muted)', marginBottom: '0.5rem' }}>
                                {t('queue.deleteCategoryBody')} "<strong>{t(`dishCategories.${confirmDeleteCategory}`, confirmDeleteCategory)}</strong>" {t('queue.deleteCategoryAsk')}
                            </p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-ink-muted)', marginBottom: '2rem' }}>
                                {t('queue.deleteCategoryAutoChange')}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button
                                    className="btn-secondary"
                                    onClick={() => setConfirmDeleteCategory(null)}
                                    style={{ padding: '0.5rem 1.5rem' }}
                                >
                                    {t('results.cancel')}
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => {
                                        deleteCategory(confirmDeleteCategory);
                                        if (activeCategory === confirmDeleteCategory) setActiveCategory('全部');
                                        setConfirmDeleteCategory(null);
                                    }}
                                    style={{ padding: '0.5rem 1.5rem', background: 'var(--color-accent)', color: 'white' }}
                                >
                                    {t('queue.confirmDelete')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default CookingQueue;
