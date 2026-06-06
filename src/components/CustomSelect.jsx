/**
 * [IN]: react, framer-motion, react-i18next, lucide-react(ChevronDown)
 * [OUT]: CustomSelect — 通用下拉选择控件（保持原有样式）
 * [POS]: 被 ResultsView、DishEditor 复用
 * [PROTOCOL]: 变更 props 时同步更新本头部与消费方
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

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

export default CustomSelect;
