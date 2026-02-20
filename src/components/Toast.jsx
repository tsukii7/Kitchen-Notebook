import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle, AlertTriangle, X } from 'lucide-react';

const ICONS = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const STYLES = {
    success: { borderLeft: '8px solid #4CAF50', iconColor: '#4CAF50' },
    error: { borderLeft: '8px solid #F44336', iconColor: '#F44336' },
    warning: { borderLeft: '8px solid #FF9800', iconColor: '#FF9800' },
    info: { borderLeft: '8px solid #2196F3', iconColor: '#2196F3' },
};

function Toast({ message, type = 'info', onClose }) {
    const Icon = ICONS[type];
    const style = STYLES[type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.3, rotate: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
            className="toast glass-card"
            style={{
                ...style,
                padding: '1rem',
                minWidth: '300px',
                maxWidth: '400px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.8rem',
                boxShadow: 'var(--shadow-hard)',
                borderRadius: '5px 255px 5px 25px / 255px 5px 25px 5px', // Wobbly box
                border: '2px solid var(--color-ink)',
                marginBottom: '0.8rem'
            }}
        >
            <Icon size={24} color={style.iconColor} strokeWidth={2.5} style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ margin: 0, flex: 1, fontSize: '1.1rem', lineHeight: '1.4' }}>{message}</p>
            <button
                onClick={onClose}
                style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    padding: 0, color: 'var(--color-ink-muted)'
                }}
            >
                <X size={18} strokeWidth={2.5} />
            </button>
        </motion.div>
    );
}

export default Toast;
