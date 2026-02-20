import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Loader2, Circle, X } from 'lucide-react';
import { useWobbly } from '../hooks/useWobbly';
import { useTranslation } from 'react-i18next';

function PipelineStepper({ stages }) {
    const { t } = useTranslation();
    // Wobbly container
    const stepperWobble = useWobbly({ min: 2, max: 4 });

    return (
        <div className="pipeline-section" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <div className="glass-card" style={{ padding: '2rem', ...stepperWobble }}>
                <h3 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'var(--font-heading)', transform: 'rotate(-1deg)' }}>
                    {t('status.active')}
                </h3>

                <div className="pipeline-steps" style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                    {/* Hand-drawn vertical line */}
                    {/* Hand-drawn vertical line with flow animation */}
                    <div style={{
                        position: 'absolute', left: '26px', top: '20px', bottom: '20px', width: '2px',
                        backgroundImage: 'linear-gradient(to bottom, var(--color-ink) 50%, transparent 50%)',
                        backgroundSize: '2px 12px',
                        zIndex: 1,
                        opacity: 0.2
                    }} />
                    <motion.div
                        initial={{ backgroundPosition: '0 0' }}
                        animate={{ backgroundPosition: '0 24px' }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        style={{
                            position: 'absolute', left: '26px', top: '20px', bottom: '20px', width: '2px',
                            backgroundImage: 'linear-gradient(to bottom, var(--color-ink) 50%, transparent 50%)',
                            backgroundSize: '2px 12px',
                            zIndex: 1
                        }}
                    />

                    {stages.map((stage, idx) => {
                        const isComplete = stage.status === 'complete';
                        const isActive = stage.status === 'processing';
                        const isPending = stage.status === 'idle';
                        const isError = stage.status === 'error';

                        return (
                            <motion.div
                                key={stage.id}
                                className={`pipeline-step ${isActive ? 'pipeline-step--active' : ''}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '1.5rem',
                                    paddingBottom: idx === stages.length - 1 ? 0 : '2rem',
                                    position: 'relative', zIndex: 2
                                }}
                            >
                                <div className="step-indicator" style={{
                                    width: '54px', height: '54px', flexShrink: 0,
                                    background: isActive ? 'var(--color-postit)' : (isComplete ? 'var(--color-ink)' : 'var(--color-white)'),
                                    border: '2px solid var(--color-ink)',
                                    borderRadius: '50% 45% 55% 50% / 55% 50% 50% 45%', // Rough circle
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: isActive ? 'var(--shadow-hard-sm)' : 'none',
                                    transform: isActive ? 'rotate(-5deg) scale(1.1)' : 'rotate(0)',
                                    transition: 'all 0.3s ease'
                                }}>
                                    {isComplete ? (
                                        <Check size={28} color="white" strokeWidth={3} />
                                    ) : isError ? (
                                        <X size={28} color="var(--color-accent)" strokeWidth={3} />
                                    ) : isActive ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                        >
                                            <Loader2 size={28} className="spin" color="var(--color-ink)" strokeWidth={2.5} />
                                        </motion.div>
                                    ) : (
                                        <motion.span
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: idx * 0.5 }}
                                            style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-ink-muted)' }}
                                        >
                                            {idx + 1}
                                        </motion.span>
                                    )}
                                </div>

                                <div className="step-content" style={{ flex: 1, paddingTop: '0.5rem' }}>
                                    <h4 style={{
                                        margin: 0, fontSize: '1.3rem',
                                        textDecoration: isComplete ? 'line-through' : 'none',
                                        textDecorationColor: 'var(--color-secondary)',
                                        textDecorationThickness: '2px',
                                        color: isPending ? 'var(--color-ink-muted)' : 'var(--color-ink)'
                                    }}>
                                        {t(`pipeline.steps.${stage.id}`, stage.label)}
                                        {isActive && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: [0, 1, 0] }}
                                                transition={{ repeat: Infinity, duration: 1.5 }}
                                                style={{ marginLeft: '10px', fontSize: '1.5rem', display: 'inline-block' }}
                                            >
                                                ...
                                            </motion.span>
                                        )}
                                    </h4>
                                    <AnimatePresence>
                                        {(isActive || isComplete || isError) && stage.detail && (
                                            <motion.p
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: isError ? 'var(--color-accent)' : 'var(--color-ink-muted)' }}
                                            >
                                                {stage.detail}
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default PipelineStepper;
