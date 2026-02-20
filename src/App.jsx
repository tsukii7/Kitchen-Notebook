import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanSearch, ListChecks, AlertTriangle, RotateCcw } from 'lucide-react';
import Header from './components/Header';
import InputTabs from './components/InputTabs';
import PipelineStepper from './components/PipelineStepper';
import ResultsView from './components/ResultsView';
import CookingQueue from './components/CookingQueue';
import Toast from './components/Toast';
import { useRecipeStore } from './hooks/useRecipeStore';
import { runPipeline, PIPELINE_STAGES, exportToJSON, exportToMarkdown } from './utils/pipeline';
import { mergeIngredients } from './utils/ingredientNormalizer';
import { useWobbly } from './hooks/useWobbly';
import { useTranslation } from 'react-i18next';

const STATES = {
    INPUT: 'input',
    PROCESSING: 'processing',
    RESULTS: 'results',
    ERROR: 'error',
};

const VIEW_TABS = {
    MAIN: 'main',
    QUEUE: 'queue',
};

function App() {
    const { t } = useTranslation();
    // Theme state kept but effectively always "light/paper" in CSS
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [appState, setAppState] = useState(STATES.INPUT);
    const [activeView, setActiveView] = useState(VIEW_TABS.MAIN);
    const [stages, setStages] = useState(PIPELINE_STAGES.map(s => ({ ...s, status: 'idle', detail: '' })));
    const [results, setResults] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);

    const store = useRecipeStore();

    // Wobbly styles for container/modals
    const containerWobble = useWobbly({ min: 250, max: 255 });

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', next);
            return next;
        });
    }, []);

    const addToast = useCallback((message, type = 'info') => {
        const id = ++toastIdRef.current;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const handleStart = useCallback(async (input) => {
        setActiveView(VIEW_TABS.MAIN);
        setAppState(STATES.PROCESSING);
        setStages(PIPELINE_STAGES.map(s => ({ ...s, status: 'idle', detail: '' })));
        setErrorMsg('');

        try {
            const result = await runPipeline(input, (stageIdx, status, detail) => {
                setStages(prev => prev.map((s, i) => {
                    if (i === stageIdx) return { ...s, status, detail };
                    if (i < stageIdx && s.status !== 'complete') return { ...s, status: 'complete' };
                    return s;
                }));
            }, t);

            setResults(result);
            setAppState(STATES.RESULTS);
            addToast(`识别完成！共 ${result.dishes.length} 道菜，${result.shoppingList.length} 种食材`, 'success');
        } catch (err) {
            setErrorMsg(err.message || '未知错误');
            setAppState(STATES.ERROR);
            addToast(err.message || '处理失败', 'error');
        }
    }, [addToast]);

    const handleReset = useCallback(() => {
        setAppState(STATES.INPUT);
        setResults(null);
        setStages(PIPELINE_STAGES.map(s => ({ ...s, status: 'idle', detail: '' })));
    }, []);

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(nextLang);
    };

    const handleSaveDish = useCallback((dish) => {
        store.saveDish(dish);
        addToast(t('toasts.savedDish', { name: dish.dish_name }), 'success');
    }, [store, addToast, t]);

    const handleUpdateDish = useCallback((dishIndex, newDish) => {
        setResults(prev => {
            if (!prev) return prev;
            const newDishes = [...prev.dishes];
            newDishes[dishIndex] = newDish;

            const newShoppingList = mergeIngredients(newDishes);

            return {
                ...prev,
                dishes: newDishes,
                shoppingList: newShoppingList
            };
        });

        if (store.isDishSaved(newDish.dish_name || newDish.name)) {
            store.saveDish(newDish);
        }
        addToast(t('toasts.updatedRecipe'), 'success');
    }, [addToast, store, t]);

    const handleSaveAll = useCallback((dishes) => {
        store.saveDishes(dishes);
        addToast(t('toasts.savedDishes', { count: dishes.length }), 'success');
    }, [store, addToast, t]);

    const handleExportJSON = useCallback(() => {
        if (!results) return;
        const json = exportToJSON(results.dishes, results.shoppingList);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recipes_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast(t('toasts.jsonDownloaded'), 'success');
    }, [results, addToast]);

    const handleExportMarkdown = useCallback(() => {
        if (!results) return;
        const md = exportToMarkdown(results.dishes, results.shoppingList, t);
        navigator.clipboard.writeText(md).then(() => {
            addToast(t('toasts.mdCopied'), 'success');
        }).catch(() => {
            const blob = new Blob([md], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recipes_${Date.now()}.md`;
            a.click();
            URL.revokeObjectURL(url);
            addToast(t('toasts.mdDownloaded'), 'success');
        });
    }, [results, addToast, t]);

    return (
        <div className="app-root" data-theme={theme}>
            <div className="app-container">
                <Header theme={theme} onToggleTheme={toggleTheme} />

                {/* View navigation */}
                <div className="view-nav" style={{ maxWidth: '400px', margin: '0 auto 2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button
                        className={`nav-btn ${activeView === VIEW_TABS.MAIN ? 'nav-btn--active' : ''}`}
                        onClick={() => setActiveView(VIEW_TABS.MAIN)}
                        style={{ fontSize: '1.2rem', padding: '0.8rem 1.5rem' }}
                    >
                        <ScanSearch size={24} strokeWidth={2.5} style={{ marginRight: 8 }} />
                        {t('nav.recognize')}
                    </button>
                    <button
                        className={`nav-btn ${activeView === VIEW_TABS.QUEUE ? 'nav-btn--active' : ''}`}
                        onClick={() => setActiveView(VIEW_TABS.QUEUE)}
                        style={{ fontSize: '1.2rem', padding: '0.8rem 1.5rem' }}
                    >
                        <ListChecks size={24} strokeWidth={2.5} style={{ marginRight: 8 }} />
                        {t('nav.queue')}
                        {store.savedDishes.length > 0 && (
                            <span
                                className="view-nav-badge"
                                style={{
                                    background: 'var(--color-accent)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    marginLeft: '8px',
                                    transform: 'rotate(-5deg)'
                                }}
                            >
                                {store.savedDishes.length}
                            </span>
                        )}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeView === VIEW_TABS.QUEUE ? (
                        <motion.div
                            key="queue"
                            initial={{ opacity: 0, y: 20, rotate: 1 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CookingQueue
                                savedDishes={store.savedDishes}
                                queue={store.queue}
                                queueDishes={store.queueDishes}
                                categories={store.categories}
                                toggleQueue={store.toggleQueue}
                                removeDish={store.removeDish}
                                clearAll={store.clearAll}
                                selectAll={store.selectAll}
                                clearQueue={store.clearQueue}
                                addCategory={store.addCategory}
                                deleteCategory={store.deleteCategory}
                                updateDishCategory={store.updateDishCategory}
                                addToast={addToast}
                            />
                        </motion.div>
                    ) : (
                        <>
                            {appState === STATES.INPUT && (
                                <motion.div
                                    key="input"
                                    initial={{ opacity: 0, y: 20, rotate: -1 }}
                                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <InputTabs onStart={handleStart} addToast={addToast} />
                                </motion.div>
                            )}

                            {appState === STATES.PROCESSING && (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <PipelineStepper stages={stages} />
                                </motion.div>
                            )}

                            {appState === STATES.ERROR && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1, rotate: window.innerWidth > 768 ? -2 : 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                    className="glass-card"
                                    style={{
                                        maxWidth: '500px',
                                        margin: '0 auto',
                                        textAlign: 'center',
                                        borderColor: 'var(--color-accent)',
                                        ...containerWobble
                                    }}
                                >
                                    <span className="error-icon" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>
                                        <AlertTriangle size={48} strokeWidth={2.5} color="var(--color-accent)" />
                                    </span>
                                    <h3 style={{ color: 'var(--color-accent)' }}>识别出错</h3>
                                    <p className="error-message" style={{ fontSize: '1.2rem' }}>{errorMsg}</p>
                                    <button className="btn-secondary" onClick={handleReset} style={{ marginTop: '1.5rem' }}>
                                        <RotateCcw size={18} strokeWidth={2.5} />
                                        重新开始
                                    </button>
                                </motion.div>
                            )}

                            {appState === STATES.RESULTS && results && (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <ResultsView
                                        dishes={results.dishes}
                                        shoppingList={results.shoppingList}
                                        rawText={results.rawText}
                                        onReset={handleReset}
                                        onExportJSON={handleExportJSON}
                                        onExportMarkdown={handleExportMarkdown}
                                        onSaveDish={handleSaveDish}
                                        onUpdateDish={handleUpdateDish}
                                        onSaveAll={handleSaveAll}
                                        isDishSaved={store.isDishSaved}
                                    />
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Toast */}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map(t => (
                        <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default App;
