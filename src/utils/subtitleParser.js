/* ============================================
   Subtitle Parser — SRT / VTT / Plain Text
   ============================================ */

/**
 * Detect subtitle format from content
 */
export function detectFormat(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('WEBVTT')) return 'vtt';
    // SRT detection: lines like "1\n00:00:00,000 --> 00:00:01,000"
    if (/^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(trimmed)) return 'srt';
    // Check if there are timestamp patterns
    if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(trimmed)) return 'srt';
    return 'text';
}

/**
 * Parse SRT format into entries
 */
function parseSRT(text) {
    const blocks = text.trim().split(/\n\s*\n/);
    const entries = [];

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 2) continue;

        // Find the timestamp line
        let tsLineIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(lines[i])) {
                tsLineIdx = i;
                break;
            }
        }

        if (tsLineIdx === -1) continue;

        const textLines = lines.slice(tsLineIdx + 1).join(' ').trim();
        if (textLines) {
            // Remove HTML tags
            const clean = textLines.replace(/<[^>]+>/g, '').trim();
            entries.push(clean);
        }
    }

    return entries;
}

/**
 * Parse VTT (WebVTT) format into entries
 */
function parseVTT(text) {
    // Remove WEBVTT header and metadata
    const content = text.replace(/^WEBVTT[\s\S]*?\n\n/, '\n\n');
    // VTT uses similar structure to SRT
    return parseSRT(content);
}

/**
 * Parse subtitle content into plain text entries
 */
export function parseSubtitles(content) {
    const format = detectFormat(content);

    let entries;
    switch (format) {
        case 'srt':
            entries = parseSRT(content);
            break;
        case 'vtt':
            entries = parseVTT(content);
            break;
        default:
            // Plain text: split by newlines
            entries = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            break;
    }

    return {
        format,
        entries,
        fullText: entries.join('\n'),
    };
}

/**
 * Read a subtitle file and parse it
 */
export function parseSubtitleFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                resolve(parseSubtitles(e.target.result));
            } catch (err) {
                reject(new Error(`字幕解析失败: ${err.message}`));
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}
