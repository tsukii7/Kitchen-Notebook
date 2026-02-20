import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat } from 'lucide-react';
import { useWobbly } from '../hooks/useWobbly';
import { useTranslation } from 'react-i18next';

// Confetti particle colors
const CONFETTI_COLORS = [
    '#FF6B6B', '#FECA57', '#48DBFB', '#FF9FF3', '#54A0FF',
    '#5F27CD', '#01A3A4', '#F368E0', '#FF6348', '#7BED9F',
    '#70A1FF', '#FFA502', '#2ED573', '#FF4757', '#ECCC68'
];

const EMOJIS = ['🎉', '🍳', '🥘', '🧑‍🍳', '🎊', '✨', '🍕', '🥗', '🍜', '🎈', '🌟', '🔥'];

function createParticle(originX, originY) {
    const isEmoji = Math.random() < 0.3;
    return {
        id: Math.random(),
        x: originX,
        y: originY,
        emoji: isEmoji ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : null,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        angle: Math.random() * 360,
        velocity: 1.5 + Math.random() * 2.5,
        spin: (Math.random() - 0.5) * 10,
        scale: 0.5 + Math.random() * 0.8,
        decay: 0.96 + Math.random() * 0.02,
        gravity: 0.03 + Math.random() * 0.02,
        opacity: 1,
        shape: Math.floor(Math.random() * 3), // 0=rect, 1=circle, 2=triangle
        width: 6 + Math.random() * 6,
        height: 4 + Math.random() * 8,
    };
}

function Header({ theme, onToggleTheme }) {
    const { t, i18n } = useTranslation();
    const logoWobble = useWobbly({ min: 200, max: 255 });
    const [particles, setParticles] = useState([]); // purely for rendering now
    const particlesRef = useRef([]); // source of truth for physics
    const [clickCount, setClickCount] = useState(0);
    const clickTimerRef = useRef(null);
    const logoRef = useRef(null);
    const frameRef = useRef(null);

    const loop = useCallback(() => {
        const current = particlesRef.current;
        if (current.length === 0) {
            frameRef.current = null;
            setParticles([]);
            return;
        }

        // Apply physics once per frame
        const updated = current
            .map(p => {
                const rad = (p.angle * Math.PI) / 180;
                return {
                    ...p,
                    x: p.x + Math.cos(rad) * p.velocity,
                    y: p.y + Math.sin(rad) * p.velocity + p.gravity * 2,
                    velocity: p.velocity * p.decay,
                    gravity: p.gravity + 0.005,
                    spin: p.spin * 0.98,
                    angle: p.angle + p.spin,
                    // Slower opacity decay for ~5s life
                    opacity: p.opacity - 0.003,
                };
            })
            .filter(p => p.opacity > 0.01);

        particlesRef.current = updated;
        setParticles(updated); // Sync with React for rendering

        frameRef.current = requestAnimationFrame(loop);
    }, []);

    const spawnConfetti = useCallback(() => {
        const rect = logoRef.current?.getBoundingClientRect();
        if (!rect) return;

        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;

        const newCount = clickCount + 1;
        setClickCount(newCount);

        // Cap at 60 active particles to preserve performance
        const count = Math.min(10 + newCount * 3, 30);
        const newParticles = Array.from({ length: count }, () => {
            const p = createParticle(originX, originY);
            // Slower, gentler initial speed and softer gravity
            p.velocity = 2 + Math.random() * 4;
            p.gravity = 0.07 + Math.random() * 0.05;
            p.decay = 0.96 + Math.random() * 0.02;
            return p;
        });

        // Add to our physics ref 
        particlesRef.current = [...particlesRef.current, ...newParticles].slice(-100);

        // Start animation if not already running
        if (!frameRef.current) {
            frameRef.current = requestAnimationFrame(loop);
        }

        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => setClickCount(0), 1500);
    }, [clickCount, loop]);

    return (
        <header className="app-header">
            <div className="header-top">
                <div className="logo">
                    <motion.div
                        ref={logoRef}
                        className="logo-icon-wrapper"
                        style={{
                            ...logoWobble,
                            border: '3px solid var(--color-ink)',
                            padding: '8px',
                            background: 'var(--color-white)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--shadow-hard-sm)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            position: 'relative',
                            zIndex: 10,
                        }}
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        whileTap={{ scale: 0.85, rotate: -10 }}
                        onClick={spawnConfetti}
                    >
                        <ChefHat size={32} strokeWidth={2.5} />
                    </motion.div>
                    <h1>{t('app.title')}</h1>
                </div>
                <button
                    onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
                    style={{
                        background: 'var(--color-white)',
                        border: '2px solid var(--color-ink)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '2px 2px 0 var(--color-ink)',
                        color: 'var(--color-ink)'
                    }}
                >
                    {i18n.language === 'zh' ? 'EN' : '中文'}
                </button>
            </div>
            <p className="subtitle">
                {t('app.subtitle')}
            </p>

            {/* Confetti Layer */}
            {particles.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        pointerEvents: 'none',
                        zIndex: 9999,
                        overflow: 'hidden',
                    }}
                >
                    {particles.map(p => (
                        <div
                            key={p.id}
                            style={{
                                position: 'absolute',
                                left: p.x,
                                top: p.y,
                                opacity: p.opacity,
                                transform: `rotate(${p.angle}deg) scale(${p.scale})`,
                                transition: 'none',
                                pointerEvents: 'none',
                                fontSize: p.emoji ? '18px' : undefined,
                            }}
                        >
                            {p.emoji ? (
                                p.emoji
                            ) : p.shape === 0 ? (
                                <div style={{
                                    width: p.width,
                                    height: p.height,
                                    background: p.color,
                                    borderRadius: '1px',
                                }} />
                            ) : p.shape === 1 ? (
                                <div style={{
                                    width: p.width,
                                    height: p.width,
                                    background: p.color,
                                    borderRadius: '50%',
                                }} />
                            ) : (
                                <div style={{
                                    width: 0,
                                    height: 0,
                                    borderLeft: `${p.width / 2}px solid transparent`,
                                    borderRight: `${p.width / 2}px solid transparent`,
                                    borderBottom: `${p.height}px solid ${p.color}`,
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </header>
    );
}

export default Header;
