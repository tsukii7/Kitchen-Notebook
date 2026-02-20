import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Upload, Mic, FileText, Type, Link, Sparkles, ClipboardList, Info, AlertTriangle, X } from 'lucide-react';
import { INPUT_TYPES } from '../utils/pipeline';
import { useWobbly } from '../hooks/useWobbly';
import { useTranslation } from 'react-i18next';


const TABS = [
    { id: INPUT_TYPES.IMAGE, label: '图片识别', icon: Image, accept: '.jpg,.jpeg,.png,.webp,.bmp,.gif' },
    { id: INPUT_TYPES.VIDEO, label: '视频上传', icon: Upload, accept: '.mp4,.mov,.webm,.avi,.mkv' },
    { id: INPUT_TYPES.AUDIO, label: '音频上传', icon: Mic, accept: '.mp3,.wav,.m4a,.ogg,.flac' },
    { id: INPUT_TYPES.SUBTITLE, label: '字幕文件', icon: FileText, accept: '.srt,.vtt,.txt' },
    { id: INPUT_TYPES.TEXT, label: '文字输入', icon: Type },
    { id: INPUT_TYPES.LINK, label: '视频链接', icon: Link },
];

function InputTabs({ onStart, addToast }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(INPUT_TYPES.IMAGE);
    const [files, setFiles] = useState([]);
    const [text, setText] = useState('');
    const [link, setLink] = useState('');
    const [ocrEnabled, setOcrEnabled] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Wobbly borders
    const tabContentWobble = useWobbly();
    const uploadZoneWobble = useWobbly({ min: 250, max: 255 });
    const inputWobble = useWobbly({ min: 2, max: 5 });

    const activeTabData = TABS.find(t => t.id === activeTab);

    const validateFile = useCallback((file, type) => {
        if (!file) return false;

        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const tabData = TABS.find(t => t.id === type);

        if (tabData && tabData.accept) {
            const accepted = tabData.accept.split(',').map(a => a.trim().toLowerCase());
            if (!accepted.includes(ext)) {
                addToast(t('errors.unsupportedFormat', { ext, accept: tabData.accept }), 'error');
                return false;
            }
        }
        return true;
    }, [addToast, t]);

    const handleFileChange = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            const validFiles = selectedFiles.filter(f => validateFile(f, activeTab));
            if (activeTab === INPUT_TYPES.IMAGE) {
                if (validFiles.length > 0) {
                    setFiles(prev => [...prev, ...validFiles]);
                    addToast(t('toasts.filesAdded', { count: validFiles.length }), 'info');
                }
            } else {
                if (validFiles.length > 0) {
                    setFiles([validFiles[0]]); // single file for others
                    addToast(t('toasts.fileSelected', { name: validFiles[0].name }), 'info');
                }
            }
            e.target.value = ''; // Reset input
        }
    }, [activeTab, addToast, validateFile, t]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files || []);
        if (droppedFiles.length > 0) {
            const validFiles = droppedFiles.filter(f => validateFile(f, activeTab));
            if (activeTab === INPUT_TYPES.IMAGE) {
                if (validFiles.length > 0) {
                    setFiles(prev => [...prev, ...validFiles]);
                    addToast(t('toasts.filesAdded', { count: validFiles.length }), 'info');
                }
            } else {
                if (validFiles.length > 0) {
                    setFiles([validFiles[0]]);
                    addToast(t('toasts.fileSelected', { name: validFiles[0].name }), 'info');
                }
            }
        }
    }, [activeTab, addToast, validateFile, t]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        setIsDragging(false);
    }, []);

    const handleSubmit = useCallback(() => {
        let input = { type: activeTab };

        switch (activeTab) {
            case INPUT_TYPES.IMAGE:
                if (files.length === 0) {
                    addToast(t('errors.noImage'), 'warning');
                    return;
                }
                input.files = files; // send array for image
                break;
            case INPUT_TYPES.VIDEO:
            case INPUT_TYPES.AUDIO:
                if (files.length === 0) {
                    addToast(t('errors.noFile'), 'warning');
                    return;
                }
                input.file = files[0];
                input.ocrEnabled = ocrEnabled;
                break;
            case INPUT_TYPES.SUBTITLE:
                if (files.length === 0 && !text.trim()) {
                    addToast(t('errors.noSubtitle'), 'warning');
                    return;
                }
                if (files.length > 0) input.file = files[0];
                else input.text = text;
                break;
            case INPUT_TYPES.LINK:
                if (!link.trim()) {
                    addToast(t('errors.noLink'), 'warning');
                    return;
                }
                input.link = link;
                break;
            case INPUT_TYPES.TEXT:
                if (!text.trim()) {
                    addToast(t('errors.noText'), 'warning');
                    return;
                }
                input.text = text;
                break;
        }

        onStart(input);
    }, [activeTab, files, text, link, ocrEnabled, onStart, addToast, t]);

    const handleLoadDemo = useCallback(() => {
        setText(t('demo.text'));
        addToast(t('toasts.demoTextLoaded'), 'success');
    }, [addToast, t]);

    const renderTabContent = () => {
        switch (activeTab) {
            case INPUT_TYPES.IMAGE:
                return (
                    <div className="tab-content-inner">
                        <div
                            className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                            style={uploadZoneWobble}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className="upload-icon-wrapper" style={{
                                display: 'inline-flex',
                                padding: '1rem',
                                border: '2px dashed var(--color-ink-muted)',
                                borderRadius: '50%',
                                marginBottom: '1rem'
                            }}>
                                <Image size={32} strokeWidth={2.5} />
                            </div>
                            <p className="upload-text">
                                {t('imageTab.dragDrop')} <span className="upload-link">{t('imageTab.clickUpload')}</span>
                            </p>
                            <p className="upload-hint">{t('imageTab.multipleTip')}</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple={activeTab === INPUT_TYPES.IMAGE}
                                accept={activeTabData.accept}
                                onChange={handleFileChange}
                                hidden
                            />
                        </div>

                        {files.length > 0 && (
                            <div className="file-previews-container" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <AnimatePresence>
                                    {files.map((file, idx) => (
                                        <motion.div
                                            key={`${file.name}-${idx}`}
                                            className="file-preview glass-card"
                                            initial={{ opacity: 0, y: 8, rotate: -1 }}
                                            animate={{ opacity: 1, y: 0, rotate: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                                        >
                                            <img
                                                className="image-thumb"
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                style={{ width: '60px', height: '60px', objectFit: 'cover', border: '2px solid var(--color-ink)', borderRadius: '5px' }}
                                            />
                                            <div className="file-info" style={{ flex: 1 }}>
                                                <span className="file-name" style={{ fontWeight: 'bold' }}>{file.name}</span>
                                                <span className="file-size" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
                                                    {(file.size / 1024).toFixed(1)} KB
                                                </span>
                                            </div>
                                            <button className="file-remove" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                                <X size={20} strokeWidth={2.5} color="var(--color-accent)" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        <div className="info-banner" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.8rem', color: 'var(--color-ink-muted)', fontStyle: 'italic' }}>
                            <Info size={18} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>{t('imageTab.multipleTip')}</span>
                        </div>
                    </div>
                );

            case INPUT_TYPES.VIDEO:
            case INPUT_TYPES.AUDIO:
                return (
                    <div className="tab-content-inner">
                        <div
                            className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
                            style={uploadZoneWobble}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <div className="upload-icon-wrapper" style={{
                                display: 'inline-flex',
                                padding: '1rem',
                                border: '2px dashed var(--color-ink-muted)',
                                borderRadius: '50%',
                                marginBottom: '1rem'
                            }}>
                                <Upload size={32} strokeWidth={2.5} />
                            </div>
                            <p className="upload-text">
                                {t('videoTab.dragDrop')} <span className="upload-link">{t('videoTab.clickUpload')}</span>
                            </p>
                            <p className="upload-hint">
                                {activeTab === INPUT_TYPES.VIDEO
                                    ? t('videoTab.videoFormats')
                                    : t('videoTab.audioFormats')
                                }
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={activeTabData.accept}
                                onChange={handleFileChange}
                                hidden
                            />
                        </div>

                        {files.length > 0 && (
                            <motion.div
                                className="file-preview glass-card"
                                initial={{ opacity: 0, y: 8, rotate: -1 }}
                                animate={{ opacity: 1, y: 0, rotate: 1 }}
                                style={{ marginTop: '1rem', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                            >
                                <span className="file-icon">
                                    {activeTab === INPUT_TYPES.VIDEO
                                        ? <Upload size={24} strokeWidth={2.5} />
                                        : <Mic size={24} strokeWidth={2.5} />
                                    }
                                </span>
                                <div className="file-info" style={{ flex: 1 }}>
                                    <span className="file-name" style={{ fontWeight: 'bold' }}>{files[0].name}</span>
                                    <span className="file-size" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
                                        {(files[0].size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                <button className="file-remove" onClick={() => setFiles([])} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                    <X size={20} strokeWidth={2.5} color="var(--color-accent)" />
                                </button>
                            </motion.div>
                        )}
                    </div>
                );

            case INPUT_TYPES.LINK:
                return (
                    <div className="tab-content-inner">
                        <div className="input-group">
                            <label className="input-label" style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }}>{t('linkTab.label')}</label>
                            <input
                                type="url"
                                className="text-input"
                                placeholder={t('linkTab.placeholder')}
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                style={inputWobble}
                            />
                        </div>
                    </div>
                );

            case INPUT_TYPES.SUBTITLE:
                return (
                    <div className="tab-content-inner">
                        <div
                            className={`upload-zone upload-zone--small ${isDragging ? 'drag-over' : ''}`}
                            style={uploadZoneWobble}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <p className="upload-text">
                                {t('subtitleTab.dragDrop')} <span className="upload-link">{t('subtitleTab.clickUpload')}</span>
                            </p>
                            <p className="upload-hint">{t('subtitleTab.formats')}</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={activeTabData.accept}
                                onChange={handleFileChange}
                                hidden
                            />
                        </div>

                        {files.length > 0 && (
                            <motion.div
                                className="file-preview glass-card"
                                initial={{ opacity: 0, y: 8, rotate: -1 }}
                                animate={{ opacity: 1, y: 0, rotate: 1 }}
                                style={{ marginTop: '1rem', padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
                            >
                                <span className="file-icon"><FileText size={24} strokeWidth={2.5} /></span>
                                <div className="file-info" style={{ flex: 1 }}>
                                    <span className="file-name" style={{ fontWeight: 'bold' }}>{files[0].name}</span>
                                    <span className="file-size" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-ink-muted)' }}>
                                        {(files[0].size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                                <button className="file-remove" onClick={() => setFiles([])} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                                    <X size={20} strokeWidth={2.5} color="var(--color-accent)" />
                                </button>
                            </motion.div>
                        )}

                        <div className="divider-or" style={{ textAlign: 'center', margin: '1.5rem 0', color: 'var(--color-ink-muted)' }}>
                            <span>{t('subtitleTab.or')}</span>
                        </div>

                        <div className="input-group">
                            <label className="input-label" style={{ fontWeight: 'bold', fontSize: '1.2rem', display: 'block', marginBottom: '0.5rem' }}>{t('subtitleTab.pasteLabel')}</label>
                            <textarea
                                className="text-area"
                                rows={6}
                                placeholder={t('textTab.placeholder')}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                style={inputWobble}
                            />
                        </div>
                    </div>
                );

            case INPUT_TYPES.TEXT:
                return (
                    <div className="tab-content-inner">
                        <div className="input-group">
                            <div className="input-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label className="input-label" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{t('tabs.text')}</label>
                                <button className="btn-demo" onClick={handleLoadDemo} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
                                    <ClipboardList size={16} strokeWidth={2.5} style={{ marginRight: 4 }} />
                                    {t('textTab.demoButton')}
                                </button>
                            </div>
                            <textarea
                                className="text-area text-area--large"
                                rows={12}
                                placeholder={t('textTab.placeholder')}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                style={inputWobble}
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <section className="input-section">
            <div className="tab-bar">
                {TABS.map((tab) => {
                    const TabIcon = tab.icon;
                    let tabTranslatedName = tab.label;
                    if (tab.id === INPUT_TYPES.IMAGE) tabTranslatedName = t('tabs.image');
                    if (tab.id === INPUT_TYPES.VIDEO) tabTranslatedName = t('tabs.video');
                    if (tab.id === INPUT_TYPES.AUDIO) tabTranslatedName = t('tabs.audio');
                    if (tab.id === INPUT_TYPES.SUBTITLE) tabTranslatedName = t('tabs.subtitle');
                    if (tab.id === INPUT_TYPES.LINK) tabTranslatedName = t('tabs.link');
                    if (tab.id === INPUT_TYPES.TEXT) tabTranslatedName = t('tabs.text');
                    return (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setFiles([]);
                            }}
                        >
                            <span className="tab-icon"><TabIcon size={18} strokeWidth={2.5} /></span>
                            <span className="tab-label">{tabTranslatedName}</span>
                        </button>
                    );
                })}
            </div>

            <div className="tab-content" style={tabContentWobble}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {renderTabContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="action-bar">
                <button className="btn-primary" onClick={handleSubmit}>
                    <span className="btn-icon"><Sparkles size={20} strokeWidth={2.5} /></span>
                    <span>{t('pipeline.start')}</span>
                </button>
            </div>
        </section>
    );
}

export default InputTabs;
