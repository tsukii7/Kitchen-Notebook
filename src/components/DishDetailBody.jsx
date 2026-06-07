/**
 * [IN]: react, react-i18next(useTranslation), ingredientColors(CAT_COLORS)
 * [OUT]: DishDetailBody — 只读展示一道菜的食材与步骤（详情弹窗正文）
 * [POS]: 被 CookingQueue 详情弹窗在非编辑态复用；编辑态由 DishEditor 接管
 * [PROTOCOL]: 变更展示字段时同步更新本头部与 CookingQueue / 模块 CLAUDE.md
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CAT_COLORS } from '../utils/ingredientColors.js';

function DishDetailBody({ dish }) {
    const { t } = useTranslation();
    return (
        <>
            <h4 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🥬</span> {t('results.ingredients')}
            </h4>
            <div className="dish-ingredients" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
                {(dish.ingredients || []).map((ing, i) => {
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
                            {ing.name} <strong style={{ color: 'var(--color-ink)' }}>{ing.amount}{ing.unit ? ` ${ing.unit}` : ''}</strong>
                        </span>
                    );
                })}
            </div>

            <h4 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🍳</span> {t('results.steps')}
            </h4>
            <div className="dish-steps" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(dish.steps || []).map((step, si) => (
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
        </>
    );
}

export default DishDetailBody;
