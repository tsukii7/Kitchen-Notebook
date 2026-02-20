/* ============================================
   Processing Pipeline — Real API Integration
   5-stage pipeline calling backend for ASR + GPT parsing
   ============================================ */

import { parseSubtitles, parseSubtitleFile } from './subtitleParser.js';
import { parseRecipes } from './recipeParser.js';
import { mergeIngredients } from './ingredientNormalizer.js';

/** Pipeline stages */
export const PIPELINE_STAGES = [
    { id: 'acquire', label: '获取媒体/字幕', icon: '' },
    { id: 'transcribe', label: '音画分析/识别', icon: '' },
    { id: 'structure', label: '结构化菜谱', icon: '' },
    { id: 'convert', label: '单位换算合并', icon: '' },
    { id: 'output', label: '输出结果', icon: '' },
];

/** Input types */
export const INPUT_TYPES = {
    VIDEO: 'video',
    LINK: 'link',
    SUBTITLE: 'subtitle',
    AUDIO: 'audio',
    TEXT: 'text',
    IMAGE: 'image',
};

const API_BASE = '/api';

/**
 * Upload a file to the backend for ASR transcription
 */
async function transcribeFile(file, onProgress, t) {
    onProgress?.(t('pipeline.progress.uploading'));

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/transcribe`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '服务器错误' }));
        throw new Error(err.error || `转写失败 (${response.status})`);
    }

    const result = await response.json();
    onProgress?.(t('pipeline.progress.transcribed', { count: result.charCount }));
    return result.text;
}

/**
 * Upload an image to the backend for OCR text extraction
 */
async function ocrFile(files, onProgress, t) {
    onProgress?.(t('pipeline.progress.uploadingImage', { count: files.length }));

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    const response = await fetch(`${API_BASE}/ocr`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '服务器错误' }));
        throw new Error(err.error || `OCR 识别失败 (${response.status})`);
    }

    const result = await response.json();
    onProgress?.(t('pipeline.progress.ocrDone', { count: result.charCount }));
    return result.text;
}

/**
 * Call GPT to parse recipe text into structured JSON
 */
async function parseRecipeWithAI(text, onProgress, t) {
    onProgress?.(t('pipeline.progress.callingAI'));

    const response = await fetch(`${API_BASE}/parse-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '服务器错误' }));
        throw new Error(err.error || `解析失败 (${response.status})`);
    }

    const result = await response.json();
    onProgress?.(t('pipeline.progress.aiDone', { count: result.recipes.length }));
    return result.recipes;
}

/**
 * Check if the backend server is available and API key is configured
 */
export async function checkBackendHealth() {
    try {
        const res = await fetch(`${API_BASE}/health`);
        if (!res.ok) return { available: false, reason: '服务器未响应' };
        const data = await res.json();
        return {
            available: true,
            apiKeyConfigured: data.apiKeyConfigured,
            model: data.model,
        };
    } catch {
        return { available: false, reason: '无法连接后端服务器，请确认已启动 npm run server' };
    }
}

/**
 * Main pipeline execution
 * @param {Object} input - { type, file?, text?, link? }
 * @param {Function} onStageChange - (stageIndex, status, detail) => void
 * @returns {Object} { dishes: [], shoppingList: [], rawText: '' }
 */
export async function runPipeline(input, onStageChange, t) {
    let rawText = '';
    let useAIParsing = false;

    // ============ Stage 1: Acquire ============
    onStageChange(0, 'active', t('pipeline.progress.acquiring'));

    switch (input.type) {
        case INPUT_TYPES.TEXT:
            rawText = input.text || '';
            useAIParsing = true;
            onStageChange(0, 'complete', t('pipeline.progress.textAcquired'));
            break;

        case INPUT_TYPES.SUBTITLE:
            if (input.file) {
                try {
                    const parsed = await parseSubtitleFile(input.file);
                    rawText = parsed.fullText;
                    onStageChange(0, 'complete', `${parsed.format.toUpperCase()} 字幕已解析 (${parsed.entries.length} 条)`);
                } catch (err) {
                    throw new Error(t('pipeline.error.subtitleFailed') + `: ${err.message}`);
                }
            } else if (input.text) {
                const parsed = parseSubtitles(input.text);
                rawText = parsed.fullText;
                onStageChange(0, 'complete', t('pipeline.progress.subtitleParsedText', { count: parsed.entries.length }));
            }
            useAIParsing = true;
            break;

        case INPUT_TYPES.VIDEO:
            onStageChange(0, 'complete', t('pipeline.progress.videoAcquired'));
            break;

        case INPUT_TYPES.AUDIO:
            onStageChange(0, 'complete', t('pipeline.progress.audioAcquired'));
            break;

        case INPUT_TYPES.IMAGE:
            onStageChange(0, 'complete', t('pipeline.progress.imageAcquired'));
            break;

        case INPUT_TYPES.LINK:
            onStageChange(0, 'active', t('pipeline.error.linkUnsupported'));
            throw new Error(t('pipeline.error.linkDetail'));

        default:
            throw new Error('不支持的输入类型');
    }

    // ============ Stage 2: Transcribe ============
    onStageChange(1, 'active', t('pipeline.progress.analyzing'));

    if (input.type === INPUT_TYPES.VIDEO || input.type === INPUT_TYPES.AUDIO) {
        // Real ASR: send file to backend Whisper API
        rawText = await transcribeFile(input.file, (msg) => onStageChange(1, 'active', msg), t);
        useAIParsing = true;
    } else if (input.type === INPUT_TYPES.IMAGE) {
        // OCR: send image to backend GPT-4o Vision
        rawText = await ocrFile(input.files, (msg) => onStageChange(1, 'active', msg), t);
        useAIParsing = true;
    }

    if (!rawText.trim()) {
        throw new Error(t('pipeline.error.noContent'));
    }

    onStageChange(1, 'complete', t('pipeline.progress.transcribed', { count: rawText.length }));

    // ============ Stage 3: Structure ============
    onStageChange(2, 'active', t('pipeline.progress.structuring'));

    let dishes;

    if (useAIParsing) {
        // Check if backend is available for AI parsing
        const health = await checkBackendHealth();

        if (health.available && health.apiKeyConfigured) {
            // Use GPT for parsing
            try {
                dishes = await parseRecipeWithAI(rawText, (msg) => onStageChange(2, 'active', msg), t);
            } catch (err) {
                console.warn('AI parsing failed, falling back to local parser:', err.message);
                onStageChange(2, 'active', t('pipeline.progress.aiFailedFallback'));
                dishes = parseRecipes(rawText);
            }
        } else {
            // Fallback: use local regex parser
            onStageChange(2, 'active', t('pipeline.progress.localFallback'));
            dishes = parseRecipes(rawText);
        }
    } else {
        dishes = parseRecipes(rawText);
    }

    if (!dishes || dishes.length === 0) {
        throw new Error(t('pipeline.error.parseFailed'));
    }

    onStageChange(2, 'complete', t('pipeline.progress.dishesStructured', { count: dishes.length }));

    // ============ Stage 4: Convert & Merge ============
    onStageChange(3, 'active', t('pipeline.progress.converting'));

    const shoppingList = mergeIngredients(dishes);

    const warningCount = shoppingList.filter(i => i.warning).length;
    onStageChange(3, 'complete',
        t('pipeline.progress.merged', { count: shoppingList.length }) +
        (warningCount > 0 ? t('pipeline.progress.warnings', { count: warningCount }) : '')
    );

    // ============ Stage 5: Output ============
    onStageChange(4, 'active', t('pipeline.progress.generating'));
    onStageChange(4, 'complete', t('pipeline.progress.completed'));

    return {
        dishes,
        shoppingList,
        rawText,
    };
}

/**
 * Export recipes to JSON string
 */
export function exportToJSON(dishes, shoppingList) {
    return JSON.stringify({
        recipes: dishes,
        shopping_list: shoppingList.map(item => ({
            name: item.name,
            total_amount: item.amount,
            category: item.category,
            warning: item.warning ? item.warningText : null,
            from_dishes: item.sources,
        })),
        exported_at: new Date().toISOString(),
    }, null, 2);
}

/**
 * Export recipes to Markdown
 */
export function exportToMarkdown(dishes, shoppingList, t) {
    let md = `# ${t('markdown.title')}\n\n`;
    md += `> ${t('markdown.genTime')}${new Date().toLocaleString('zh-CN')}\n\n`;

    // Shopping list
    md += `## ${t('markdown.shoppingList')}\n\n`;
    md += `${t('markdown.tableHeader')}\n`;
    for (const item of shoppingList) {
        const note = item.warning ? `${t('markdown.warning')}${item.warningText}` : '';
        md += `| ${item.name} | ${item.amount} | ${t(`ingCategories.${item.category}`, item.category)} | ${note} |\n`;
    }
    md += '\n';

    // Each dish
    md += `## ${t('markdown.dishDetails')}\n\n`;
    for (const dish of dishes) {
        md += `### ${dish.dish_name}\n\n`;
        md += `${t('markdown.ingredients')}\n`;
        for (const ing of (dish.ingredients || [])) {
            md += `- ${ing.name} ${ing.amount ?? ing.quantity ?? ''}${ing.unit || ''}\n`;
        }
        md += `\n${t('markdown.steps')}\n`;
        (dish.steps || []).forEach((step, i) => {
            md += `${i + 1}. ${step}\n`;
        });
        md += '\n---\n\n';
    }

    return md;
}
